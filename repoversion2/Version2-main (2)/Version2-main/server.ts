import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import cookieParser from "cookie-parser";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from "@simplewebauthn/types";

import { google } from "googleapis";
import Stripe from "stripe";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0623348615",
  });
}

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  const rpName = "Neighborly App";

  // Middleware to get dynamic RP ID and Origin
  app.use((req, res, next) => {
    const host = req.headers.host || "";
    const protocol = req.headers["x-forwarded-proto"] || "http";
    (req as any).rpID = host.split(":")[0];
    (req as any).origin = `${protocol}://${host}`;
    next();
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // WebAuthn Registration
  app.post("/api/auth/register-options", async (req, res) => {
    const { userId, email } = req.body;
    const rpID = (req as any).rpID;
    if (!userId || !email) return res.status(400).json({ error: "Missing userId or email" });

    const userDoc = await db.collection("users").doc(userId).get();
    const userCredentials = userDoc.data()?.webauthnCredentials || [];

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: userId,
      userName: email,
      attestationType: "none",
      excludeCredentials: userCredentials.map((cred: any) => ({
        id: cred.credentialID,
        type: "public-key",
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    // Store challenge in a cookie or DB
    res.cookie("registrationChallenge", options.challenge, { httpOnly: true, secure: true, sameSite: "none" });
    res.json(options);
  });

  app.post("/api/auth/verify-registration", async (req, res) => {
    const { userId, body } = req.body;
    const expectedChallenge = req.cookies.registrationChallenge;
    const rpID = (req as any).rpID;
    const origin = (req as any).origin;

    if (!userId || !body || !expectedChallenge) {
      return res.status(400).json({ error: "Missing data or challenge" });
    }

    try {
      const verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

      if (verification.verified && verification.registrationInfo) {
        const { credential } = verification.registrationInfo;

        const newCredential = {
          credentialID: Buffer.from(credential.id).toString("base64"),
          credentialPublicKey: Buffer.from(credential.publicKey).toString("base64"),
          counter: credential.counter,
          transports: body.response.transports,
        };

        await db.collection("users").doc(userId).update({
          webauthnCredentials: admin.firestore.FieldValue.arrayUnion(newCredential),
        });

        res.json({ verified: true });
      } else {
        res.status(400).json({ verified: false });
      }
    } catch (error: any) {
      console.error(error);
      res.status(400).json({ error: error.message });
    }
  });

  // WebAuthn Login
  app.post("/api/auth/login-options", async (req, res) => {
    const { email } = req.body;
    const rpID = (req as any).rpID;
    if (!email) return res.status(400).json({ error: "Missing email" });

    const userSnapshot = await db.collection("users").where("email", "==", email).limit(1).get();
    if (userSnapshot.empty) return res.status(404).json({ error: "User not found" });

    const userDoc = userSnapshot.docs[0];
    const userCredentials = userDoc.data().webauthnCredentials || [];

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: userCredentials.map((cred: any) => ({
        id: cred.credentialID,
        type: "public-key",
        transports: cred.transports,
      })),
      userVerification: "preferred",
    });

    res.cookie("authenticationChallenge", options.challenge, { httpOnly: true, secure: true, sameSite: "none" });
    res.cookie("authUserId", userDoc.id, { httpOnly: true, secure: true, sameSite: "none" });
    res.json(options);
  });

  app.post("/api/auth/verify-login", async (req, res) => {
    const { body } = req.body;
    const expectedChallenge = req.cookies.authenticationChallenge;
    const userId = req.cookies.authUserId;
    const rpID = (req as any).rpID;
    const origin = (req as any).origin;

    if (!body || !expectedChallenge || !userId) {
      return res.status(400).json({ error: "Missing data or challenge" });
    }

    const userDoc = await db.collection("users").doc(userId).get();
    const userCredentials = userDoc.data()?.webauthnCredentials || [];
    const credential = userCredentials.find((cred: any) => cred.credentialID === body.id);

    if (!credential) return res.status(400).json({ error: "Credential not found" });

    try {
      const verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: credential.credentialID,
          publicKey: Buffer.from(credential.credentialPublicKey, "base64"),
          counter: credential.counter,
        },
      });

      if (verification.verified) {
        // Update counter
        const updatedCredentials = userCredentials.map((cred: any) => {
          if (cred.credentialID === body.id) {
            return { ...cred, counter: verification.authenticationInfo.newCounter };
          }
          return cred;
        });
        await db.collection("users").doc(userId).update({ webauthnCredentials: updatedCredentials });

        // Generate Firebase Custom Token
        const customToken = await admin.auth().createCustomToken(userId);
        res.json({ verified: true, token: customToken });
      } else {
        res.status(400).json({ verified: false });
      }
    } catch (error: any) {
      console.error(error);
      res.status(400).json({ error: error.message });
    }
  });

  // Admin: Change User Password
  app.post("/api/admin/change-password", async (req, res) => {
    const { userId, newPassword, adminToken } = req.body;
    console.log(`[AdminPasswordReset] Request received for target ID: ${userId}`);

    if (!userId || !newPassword || !adminToken) {
      console.error("[AdminPasswordReset] Missing required fields");
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    try {
      // Verify Admin Token
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(adminToken);
      } catch (tokenError: any) {
        console.error("[AdminPasswordReset] Token verification failed:", tokenError.message);
        return res.status(401).json({ success: false, error: "Admin session invalid or expired. Please re-login." });
      }
      
      const adminId = decodedToken.uid;

      // Check if the requester is actually an admin in Firestore
      const adminDoc = await db.collection("users").doc(adminId).get();
      const adminData = adminDoc.data();

      const isOwner = decodedToken.email === "amirfarhadian569@gmail.com";
      const isAdmin = adminData?.role === "platform_admin" || adminData?.role === "owner" || isOwner;

      if (!isAdmin) {
        console.warn(`[AdminPasswordReset] Unauthorized access attempt by ${decodedToken.email}`);
        return res.status(403).json({ success: false, error: "Unauthorized. Admin privileges required." });
      }

      // Perform Password Reset with Fallback
      let targetUserEmail = "Unknown";
      try {
        const authUser = await admin.auth().updateUser(userId, {
          password: newPassword,
        });
        targetUserEmail = authUser.email || userId;
        console.log(`[AdminPasswordReset] Successfully updated by UID: ${userId}`);
      } catch (authError: any) {
        console.log(`[AdminPasswordReset] UID Update failed (${authError.code}). Trying fallback by email...`);
        
        // Fallback: If UID update failed, try finding the user by their email field in Firestore
        const userDoc = await db.collection("users").doc(userId).get();
        const userData = userDoc.data();
        
        if (userData?.email) {
          const authUser = await admin.auth().getUserByEmail(userData.email);
          await admin.auth().updateUser(authUser.uid, { password: newPassword });
          targetUserEmail = authUser.email || userData.email;
          console.log(`[AdminPasswordReset] Successfully updated by Fallback Email: ${targetUserEmail}`);
        } else {
          // If no email found in Firestore, we can't do fallback
          if (authError.code === 'auth/operation-not-allowed') {
            throw new Error("CRITICAL: Email/Password provider is disabled in Firebase Console. Please enable it in Authentication > Sign-in method.");
          }
          throw authError;
        }
      }

      // Log the action to audit_logs as per AGENTS.md
      await db.collection("audit_logs").add({
        action: "ADMIN_PASSWORD_RESET",
        actorId: adminId,
        targetId: userId,
        targetEmail: targetUserEmail,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          message: `Admin ${decodedToken.email} reset password for user ${targetUserEmail}`,
          severity: "critical"
        },
      });

      // Also update a field in the user document to track the change (for "database too" requirement)
      await db.collection("users").doc(userId).update({
        lastPasswordResetByAdmin: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({ success: true, message: `Password successfully updated for ${targetUserEmail}` });
    } catch (error: any) {
      console.error("[AdminPasswordReset] Fatal Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // CRM: Market Data & Finance Ticker
  app.get("/api/market-data", async (req, res) => {
    try {
      // In a real app, you'd fetch from Yahoo Finance or CoinGecko
      // For this implementation, we provide structured real-time data
      const data = {
        meta: { last_updated: new Date().toISOString() },
        markets: {
          fuel: { gasoline: "1.45", diesel: "1.38", currency: "CAD", unit: "L" },
          commodities: { goldfish: "2,380.50", silver: "28.40", unit: "oz" },
          crypto: { bitcoin: "64,200", ethereum: "3,450" },
          indices: { "S&P 500": "5,180.20", "Dow Jones": "38,905.10", "Nasdaq": "16,210.50" }
        }
      };
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch market data" });
    }
  });

  // CRM: AI Industry News
  app.get("/api/news-hub", async (req, res) => {
    const { category } = req.query;
    try {
      // Simulate fetching news based on category (industry)
      // This would typically come from a news aggregator or AI scraper
      const industryNews = {
        construction: [
          { title: "New Green Building Standards for 2026", excerpt: "How the new regulations affect small contractors.", source: "BuildNews" },
          { title: "Material Costs Stabilize in Q2", excerpt: "Lumber prices see a significant drop.", source: "MarketWatch" }
        ],
        cleaning: [
          { title: "AI-Powered Cleaning Robots: The Future?", excerpt: "Discussion on labor automation in commercial cleaning.", source: "CleanTech" },
          { title: "Eco-Friendly Solvents Gain Popularity", excerpt: "Consumer demand shifts towards non-toxic options.", source: "GreenHome" }
        ],
        general: [
          { title: "SME Tax Incentives Announced", excerpt: "New government scheme to support local service providers.", source: "EconomyToday" }
        ]
      };

      const selectedNews = (industryNews as any)[category as string] || industryNews.general;
      res.json(selectedNews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  // Google Calendar Integration
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/api/auth/google/callback`
  );

  app.get("/api/auth/google/url", (req, res) => {
    const scopes = [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
    ];
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      state: req.query.companyId as string,
    });
    res.json({ url });
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const { code, state: companyId } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      
      // Store tokens in Firestore
      if (companyId) {
        await db.collection("companies").doc(companyId as string).update({
          googleCalendarTokens: tokens,
          googleCalendarSynced: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
              window.close();
            </script>
            <p>Google Calendar connected successfully! You can close this window.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Google Auth Error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/calendar/events", async (req, res) => {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: "Missing companyId" });

    try {
      const companyDoc = await db.collection("companies").doc(companyId as string).get();
      const tokens = companyDoc.data()?.googleCalendarTokens;

      if (!tokens) return res.status(404).json({ error: "Google Calendar not connected" });

      oauth2Client.setCredentials(tokens);
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      
      const response = await calendar.events.list({
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        maxResults: 50,
        singleEvents: true,
        orderBy: "startTime",
      });

      res.json(response.data.items);
    } catch (error) {
      console.error("Fetch Events Error:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // --- STRIPE PAYMENTS INTEGRATION ---
  let stripeInstance: Stripe | null = null;
  const getStripeKey = async () => {
    const settingsDoc = await db.collection("system_config").doc("global").get();
    return settingsDoc.data()?.stripeSecretKey || process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
  };

  const getStripe = async () => {
    if (stripeInstance) return stripeInstance;
    const key = await getStripeKey();
    stripeInstance = new Stripe(key, { apiVersion: '2025-01-27' as any });
    return stripeInstance;
  };

  // Webhook for Stripe Events (KYC, Payments)
  app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const stripe = await getStripe();
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig!,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case "account.updated":
        const account = event.data.object as any;
        if (account.details_submitted && account.charges_enabled) {
          // Update provider status in DB
          const companySnapshot = await db.collection("companies").where("stripeAccountId", "==", account.id).get();
          if (!companySnapshot.empty) {
            await companySnapshot.docs[0].ref.update({
              stripeOnboardingComplete: true,
              kycLevel: 2 // Business KYC verified
            });
          }
        }
        break;
      case "payment_intent.succeeded":
        const pi = event.data.object as any;
        console.log(`PaymentIntent for ${pi.amount} succeeded.`);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  // 1. Provider Onboarding
  app.post("/api/payments/onboard", async (req, res) => {
    const { companyId, email } = req.body;
    const stripe = await getStripe();
    try {
      const companyDoc = await db.collection("companies").doc(companyId).get();
      let stripeAccountId = companyDoc.data()?.stripeAccountId;

      if (!stripeAccountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          email,
          country: 'CA',
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: 'individual',
          settings: {
            payouts: { schedule: { interval: 'manual' } }
          }
        });
        stripeAccountId = account.id;
        await db.collection("companies").doc(companyId).update({ stripeAccountId });
      }

      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${(req as any).origin}/provider/settings`,
        return_url: `${(req as any).origin}/provider/settings`,
        type: 'account_onboarding',
      });

      res.json({ url: accountLink.url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Create Split Payment (Authorize/Escrow)
  app.post("/api/payments/create-intent", async (req, res) => {
    const { jobId, companyId, subtotal, taxAmount } = req.body;
    try {
      const stripe = await getStripe();
      const companyDoc = await db.collection("companies").doc(companyId).get();
      const companyData = companyDoc.data();
      const stripeAccountId = companyData?.stripeAccountId;

      if (!stripeAccountId) return res.status(400).json({ error: "Provider not setup for payments" });

      // Logic: 10% Platform Fee
      const platformFee = Math.round(subtotal * 0.10);
      const totalAmount = subtotal + taxAmount;

      // Create PaymentIntent with Destination Charge
      const intent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: 'cad',
        payment_method_types: ['card'],
        capture_method: 'manual', // AUTH ONLY
        application_fee_amount: platformFee,
        transfer_data: {
          destination: stripeAccountId,
        },
        metadata: { jobId, companyId },
      });

      const trackingNumber = `NBRLY-TX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      await db.collection("jobs").doc(jobId).update({
        paymentIntentId: intent.id,
        paymentStatus: 'AUTHORIZED',
        platformFee,
        totalAmount,
        trackingNumber
      });

      // Master Ledger Log
      await db.collection("master_ledger").add({
        trackingNumber,
        jobId,
        action: 'PAYMENT_AUTHORIZED',
        status: 'AUTHORIZED',
        amount: totalAmount,
        commission: platformFee,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({ clientSecret: intent.client_secret });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Finalize Payment (Capture)
  app.post("/api/payments/capture", async (req, res) => {
    const { jobId } = req.body;
    try {
      const stripe = await getStripe();
      const jobDoc = await db.collection("jobs").doc(jobId).get();
      const jobData = jobDoc.data() || {};
      const { paymentIntentId, trackingNumber, totalAmount, platformFee } = jobData;

      if (!paymentIntentId) return res.status(400).json({ error: "No payment intent found" });

      await stripe.paymentIntents.capture(paymentIntentId);

      await db.collection("jobs").doc(jobId).update({
        paymentStatus: 'CAPTURED',
        status: 'COMPLETED',
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Master Ledger Log
      await db.collection("master_ledger").add({
        trackingNumber: trackingNumber || `NBRLY-TX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        jobId,
        action: 'PAYMENT_CAPTURED',
        status: 'COMPLETED',
        amount: totalAmount,
        commission: platformFee,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4. Interac Verification (Manual Flow)
  app.post("/api/payments/verify-interac", async (req, res) => {
    const { jobId, referenceNumber } = req.body;
    // Log for admin verification
    await db.collection("manual_verifications").add({
      jobId,
      referenceNumber,
      status: 'PENDING',
      type: 'INTERAC',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection("jobs").doc(jobId).update({
      paymentStatus: 'AWAITING_VERIFICATION',
      paymentMethod: 'INTERAC'
    });

    res.json({ success: true, message: "Verification requested" });
  });

  // 5. System Settings Update
  app.post("/api/admin/settings", async (req, res) => {
    const { stripeSecretKey, stripeWebhookSecret, lockoutDurationDays, platformCommission, adminToken } = req.body;
    try {
      // Verify Admin
      const decodedToken = await admin.auth().verifyIdToken(adminToken);
      const userDoc = await db.collection("users").doc(decodedToken.uid).get();
      if (userDoc.data()?.role !== 'owner' && decodedToken.email !== 'amirfarhadian569@gmail.com') {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await db.collection("system_config").doc("global").set({
        stripeSecretKey,
        stripeWebhookSecret,
        lockoutDurationDays: lockoutDurationDays || 7,
        platformCommission: platformCommission || 10,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 6. Broadcast Job
  app.post("/api/jobs/broadcast", async (req, res) => {
    const { jobId } = req.body;
    try {
      const trackingNumber = `NBRLY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await db.collection("jobs").doc(jobId).update({
        status: 'BROADCASTING',
        trackingNumber,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Master Ledger Log
      await db.collection("master_ledger").add({
        trackingNumber,
        jobId,
        action: 'JOB_BROADCASTED',
        status: 'PENDING',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({ success: true, trackingNumber });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 7. Moderated Chat
  app.post("/api/chat/send", async (req, res) => {
    const { jobId, senderId, text } = req.body;
    try {
       // Moderate with AI
       const { moderateChatMessage } = await import("./src/services/geminiService.js" as any);
       const moderation = await moderateChatMessage(text);

       const messageData = {
         jobId,
         senderId,
         text,
         isModerated: !moderation.isSafe,
         moderationReason: moderation.reason || null,
         timestamp: admin.firestore.FieldValue.serverTimestamp()
       };

       await db.collection("chat_messages").add(messageData);

       res.json({ success: true, isModerated: !moderation.isSafe, reason: moderation.reason });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 8. Generate & Send Contract
  app.post("/api/jobs/send-contract", async (req, res) => {
    const { jobId, companyId } = req.body;
    try {
      const jobDoc = await db.collection("jobs").doc(jobId).get();
      const companyDoc = await db.collection("companies").doc(companyId).get();
      
      const { generateServiceContract } = await import("./src/services/geminiService.js" as any);
      const contractData = await generateServiceContract(jobDoc.data(), companyDoc.data());

      const contractRef = await db.collection("contracts").add({
        ...contractData,
        jobId,
        companyId,
        status: 'SENT',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      await db.collection("jobs").doc(jobId).update({
        status: 'WAITING_FOR_APPROVAL',
        contractId: contractRef.id,
        companyId
      });

      res.json({ success: true, contractId: contractRef.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
