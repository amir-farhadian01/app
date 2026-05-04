import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/types';
import prisma from '../lib/db.js';
import { generateTokenPair, verifyRefreshToken, signAccessToken } from '../lib/jwt.js';
import { authenticate, AuthRequest } from '../lib/auth.middleware.js';
import { publish } from '../lib/bus.js';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const OWNER_EMAIL = 'amirfarhadian569@gmail.com';
const rpName = 'Neighborly App';

// ─── Register ────────────────────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, displayName, role = 'customer' } = req.body;
  if (!email || !password || !displayName)
    return res.status(400).json({ error: 'Missing required fields' });

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const assignedRole = email === OWNER_EMAIL ? 'owner' : role;

    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        displayName,
        role: assignedRole as any,
        isVerified: email === OWNER_EMAIL,
      },
    });

    const tokens = generateTokenPair({ userId: user.id, email: user.email, role: user.role });
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } });

    await publish('user.registered', { userId: user.id, email: user.email, role: user.role });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      accessToken: tokens.accessToken,
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role, companyId: user.companyId },
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Login ───────────────────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended' });

    const tokens = generateTokenPair({ userId: user.id, email: user.email, role: user.role });
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken: tokens.accessToken,
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role, companyId: user.companyId },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Google OAuth ─────────────────────────────────────────────────────────────
// Accepts either an id_token (from Google One Tap) or an access_token (from OAuth flow)
router.post('/google', async (req: Request, res: Response) => {
  const { idToken, accessToken, email: directEmail, name: directName, picture } = req.body;

  let googleEmail: string | undefined;
  let googleName: string | undefined;
  let googlePicture: string | undefined;

  try {
    if (idToken) {
      // Verify Google ID token
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.email) return res.status(400).json({ error: 'Invalid Google token' });
      googleEmail = payload.email;
      googleName = payload.name;
      googlePicture = payload.picture;
    } else if (accessToken) {
      // Use access token to fetch user info from Google
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!userInfoRes.ok) return res.status(401).json({ error: 'Invalid Google access token' });
      const userInfo = await userInfoRes.json() as any;
      googleEmail = userInfo.email || directEmail;
      googleName = userInfo.name || directName;
      googlePicture = userInfo.picture || picture;
    } else if (directEmail) {
      // Fallback: trust provided email (dev/testing only)
      googleEmail = directEmail;
      googleName = directName;
      googlePicture = picture;
    } else {
      return res.status(400).json({ error: 'Missing token or email' });
    }

    if (!googleEmail) return res.status(400).json({ error: 'Could not retrieve email' });

    let user = await prisma.user.findUnique({ where: { email: googleEmail } });
    if (!user) {
      const assignedRole = googleEmail === OWNER_EMAIL ? 'owner' : 'customer';
      user = await prisma.user.create({
        data: {
          email: googleEmail,
          displayName: googleName || googleEmail,
          avatarUrl: googlePicture,
          role: assignedRole as any,
          isVerified: googleEmail === OWNER_EMAIL,
        },
      });
    }

    const tokens = generateTokenPair({ userId: user.id, email: user.email, role: user.role });
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken: tokens.accessToken,
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role, companyId: user.companyId },
    });
  } catch (err: any) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

// ─── Refresh Token ────────────────────────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  try {
    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.refreshToken !== token) return res.status(401).json({ error: 'Invalid refresh token' });

    const newAccessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });
    res.json({ accessToken: newAccessToken });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// ─── Logout ──────────────────────────────────────────────────────────────────
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({ where: { id: req.user!.userId }, data: { refreshToken: null } });
    res.clearCookie('refreshToken');
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ─── Get Me ───────────────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, displayName: true, role: true, status: true,
                companyId: true, isVerified: true, avatarUrl: true, bio: true, location: true,
                phone: true, mfaEnabled: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── WebAuthn Registration Options ───────────────────────────────────────────
router.post('/register-options', async (req: Request, res: Response) => {
  const { userId, email } = req.body;
  const rpID = (req as any).rpID;
  if (!userId || !email) return res.status(400).json({ error: 'Missing userId or email' });

  try {
    const credentials = await prisma.webAuthnCredential.findMany({ where: { userId } });

    const options = await generateRegistrationOptions({
      rpName, rpID,
      userID: Buffer.from(userId),
      userName: email,
      attestationType: 'none',
      excludeCredentials: credentials.map((c) => ({
        id: c.credentialID,
        type: 'public-key' as const,
      })),
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    });

    res.cookie('registrationChallenge', options.challenge, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'none',
    });
    res.json(options);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── WebAuthn Verify Registration ─────────────────────────────────────────────
router.post('/verify-registration', async (req: Request, res: Response) => {
  const { userId, body } = req.body;
  const expectedChallenge = req.cookies.registrationChallenge;
  const rpID = (req as any).rpID;
  const origin = (req as any).origin;

  if (!userId || !body || !expectedChallenge)
    return res.status(400).json({ error: 'Missing data or challenge' });

  try {
    const verification = await verifyRegistrationResponse({
      response: body as RegistrationResponseJSON,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo;
      await prisma.webAuthnCredential.create({
        data: {
          userId,
          credentialID: Buffer.from(credential.id).toString('base64'),
          credentialPublicKey: Buffer.from(credential.publicKey).toString('base64'),
          counter: BigInt(credential.counter),
          transports: JSON.stringify(body.response.transports || []),
        },
      });
      res.json({ verified: true });
    } else {
      res.status(400).json({ verified: false });
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── WebAuthn Login Options ───────────────────────────────────────────────────
router.post('/login-options', async (req: Request, res: Response) => {
  const { email } = req.body;
  const rpID = (req as any).rpID;
  if (!email) return res.status(400).json({ error: 'Missing email' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const credentials = await prisma.webAuthnCredential.findMany({ where: { userId: user.id } });
    if (!credentials.length) return res.status(400).json({ error: 'No credentials registered' });

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: credentials.map((c) => ({
        id: c.credentialID,
        type: 'public-key' as const,
        transports: c.transports ? JSON.parse(c.transports) : [],
      })),
      userVerification: 'preferred',
    });

    res.cookie('authenticationChallenge', options.challenge, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'none',
    });
    res.cookie('authUserId', user.id, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'none',
    });
    res.json(options);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── WebAuthn Verify Login ────────────────────────────────────────────────────
router.post('/verify-login', async (req: Request, res: Response) => {
  const { body } = req.body;
  const expectedChallenge = req.cookies.authenticationChallenge;
  const userId = req.cookies.authUserId;
  const rpID = (req as any).rpID;
  const origin = (req as any).origin;

  if (!body || !expectedChallenge || !userId)
    return res.status(400).json({ error: 'Missing data or challenge' });

  try {
    const credential = await prisma.webAuthnCredential.findUnique({
      where: { credentialID: body.id },
    });
    if (!credential) return res.status(400).json({ error: 'Credential not found' });

    const verification = await verifyAuthenticationResponse({
      response: body as AuthenticationResponseJSON,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credential.credentialID,
        publicKey: Buffer.from(credential.credentialPublicKey, 'base64'),
        counter: Number(credential.counter),
      },
    });

    if (verification.verified) {
      await prisma.webAuthnCredential.update({
        where: { id: credential.id },
        data: { counter: BigInt(verification.authenticationInfo.newCounter) },
      });

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const tokens = generateTokenPair({ userId: user.id, email: user.email, role: user.role });
      await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } });

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        verified: true,
        accessToken: tokens.accessToken,
        user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role, companyId: user.companyId },
      });
    } else {
      res.status(400).json({ verified: false });
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
