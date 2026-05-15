import express, { type Express, type RequestHandler } from "express";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import "dotenv/config";

import prisma from "./lib/db.js";
import { getRedis } from "./lib/cache.js";
import { getNats, startNatsNotificationConsumers } from "./lib/bus.js";
import { ensureMediaSchema } from "./lib/mediaDb.js";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import serviceRoutes from "./routes/services.js";
import requestRoutes from "./routes/requests.js";
import contractRoutes from "./routes/contracts.js";
import ticketRoutes from "./routes/tickets.js";
import notificationRoutes from "./routes/notifications.js";
import companyRoutes from "./routes/companies.js";
import postRoutes from "./routes/posts.js";
import chatRoutes from "./routes/chat.js";
import categoryRoutes from "./routes/categories.js";
import adminRoutes from "./routes/admin.js";
import adminKycRoutes from "./routes/adminKyc.js";
import systemRoutes from "./routes/system.js";
import placesRoutes from "./routes/places.js";
import transactionRoutes from "./routes/transactions.js";
import kycRoutes from "./routes/kyc.js";
import kycUserRoutes from "./routes/kycUser.js";
import uploadRoutes from "./routes/upload.js";
import mediaRoutes from "./routes/media.js";
import serviceCatalogRoutes from "./routes/serviceCatalog.js";
import adminServiceDefinitionsRoutes from "./routes/adminServiceDefinitions.js";
import adminCategoriesTreeRoutes from "./routes/adminCategoriesTree.js";
import ordersRoutes from "./routes/orders.js";
import adminOrdersRoutes from "./routes/adminOrders.js";
import workspacesRoutes from "./routes/workspaces.js";
import adminServicePackagesRoutes from "./routes/adminServicePackages.js";
import adminProductsRoutes from "./routes/adminProducts.js";
import productsRoutes from "./routes/products.js";
import orderChatRoutes from "./routes/orderChat.js";
import adminChatRoutes from "./routes/adminChat.js";
import orderContractsRoutes from "./routes/orderContracts.js";
import adminContractsRoutes from "./routes/adminContracts.js";
import orderPaymentsRoutes from "./routes/orderPayments.js";
import adminPaymentsRoutes from "./routes/adminPayments.js";
import feedRoutes from "./routes/feed.js";
import utilityLinksRoutes from "./routes/utilityLinks.js";
import adminMediaRoutes from "./routes/adminMedia.js";
import adminUtilityLinksRoutes from "./routes/adminUtilityLinks.js";
import providersRoutes from "./routes/providers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function mountApiRoutes(app: Express) {
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), version: "2.0.0" });
  });
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/services", serviceRoutes);
  app.use("/api/service-catalog", serviceCatalogRoutes);
  app.use("/api/requests", requestRoutes);
  app.use("/api/contracts", contractRoutes);
  app.use("/api/tickets", ticketRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/companies", companyRoutes);
  app.use("/api/posts", postRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/admin/kyc", adminKycRoutes);
  app.use("/api/admin/service-definitions", adminServiceDefinitionsRoutes);
  app.use("/api/admin/categories-tree", adminCategoriesTreeRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/orders/:orderId/chat", orderChatRoutes);
  app.use("/api/orders/:orderId/contracts", orderContractsRoutes);
  app.use("/api/orders/:orderId/payments", orderPaymentsRoutes);
  app.use("/api/admin/orders", adminOrdersRoutes);
  app.use("/api/admin/contracts", adminContractsRoutes);
  app.use("/api/admin/payments", adminPaymentsRoutes);
  app.use("/api/admin/chat", adminChatRoutes);
  app.use("/api/workspaces", workspacesRoutes);
  app.use("/api/admin/service-packages", adminServicePackagesRoutes);
  app.use("/api/admin/products", adminProductsRoutes);
  app.use("/api/products", productsRoutes);
  app.use("/api/system", systemRoutes);
  app.use("/api/places", placesRoutes);
  app.use("/api/transactions", transactionRoutes);
  app.use("/api/kyc/v2", kycUserRoutes);
  app.use("/api/kyc", kycRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/media", mediaRoutes);
  app.use("/api/feed", feedRoutes);
  app.use("/api/utility-links", utilityLinksRoutes);
  app.use("/api/admin/media", adminMediaRoutes);
  app.use("/api/admin/utility-links", adminUtilityLinksRoutes);
  app.use("/api/providers", providersRoutes);
}

function createWebApp(): Express {
  const app = express();
  const isProd = process.env.NODE_ENV === "production";

  app.use(morgan("dev"));
  app.use(cookieParser());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(
    cors({
      origin: process.env.ALLOWED_ORIGIN || true,
      credentials: true,
    }),
  );
  app.use(helmet({ contentSecurityPolicy: false }));

  const uploadsDir = path.join(process.cwd(), "uploads");
  app.use(
    "/uploads",
    express.static(uploadsDir, {
      fallthrough: false,
      maxAge: "7d",
    }),
  );

  app.use((req, _res, next) => {
    const host = req.headers.host || "";
    const protocol = (req.headers["x-forwarded-proto"] as string) || (isProd ? "https" : "http");
    (req as any).rpID = host.split(":")[0];
    (req as any).origin = `${protocol}://${host}`;
    next();
  });

  // Root route — shows API status page in browser
  app.get("/", (_req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Neighborly API</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0d0f1a; color: #f0f2ff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #1a1d2e; border: 1px solid #2a2f4a; border-radius: 12px; padding: 2rem; max-width: 480px; width: 90%; }
    h1 { margin: 0 0 0.5rem; font-size: 1.5rem; }
    .status { color: #4ade80; font-weight: 600; }
    .links { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
    a { color: #60a5fa; text-decoration: none; padding: 0.5rem 1rem; border: 1px solid #2a2f4a; border-radius: 8px; text-align: center; }
    a:hover { background: #2a2f4a; }
    .badge { display: inline-block; background: #4ade80; color: #000; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Neighborly API</h1>
    <p><span class="badge">● RUNNING</span></p>
    <p style="color:#8b90b0;font-size:0.875rem;">Version 2.0</p>
    <div class="links">
      <a href="/api/system/config">⚙️ System Config</a>
      <a href="http://localhost:5173">🚀 Frontend (port 5173)</a>
      <a href="http://localhost:7357">📱 Flutter (port 7357)</a>
    </div>
  </div>
</body>
</html>`);
  });

  mountApiRoutes(app);

  return app;
}

async function startServer() {
  const PORT = parseInt(process.env.PORT || "8080", 10);
  const ADMIN_PORT = parseInt(process.env.ADMIN_PORT || "9090", 10);
  if (PORT === ADMIN_PORT) {
    console.error("PORT and ADMIN_PORT must differ. Set ADMIN_PORT in .env (e.g. 9090).");
    process.exit(1);
  }
  const isProd = process.env.NODE_ENV === "production";

  const mainApp = createWebApp();
  const adminApp = createWebApp();

  try {
    await prisma.$connect();
    console.log("PostgreSQL connected");
  } catch (err) {
    console.error("DB connection failed:", err);
    process.exit(1);
  }

  try {
    await getRedis().ping();
    console.log("Redis ready");
  } catch {
    console.warn("Redis not available (non-fatal)");
  }

  try {
    await getNats();
    await startNatsNotificationConsumers();
  } catch {
    console.warn("NATS not available (non-fatal)");
  }

  try {
    await ensureMediaSchema();
    console.log("Media DB schema ready");
  } catch {
    console.warn("Media DB not available (non-fatal)");
  }

  if (!isProd) {
    // Dev mode: API-only — new frontend runs separately on port 5173 (Vite dev server in frontend/)
    // Old SPA middleware removed since src/ was deleted (Phase 3 cleanup).
    console.log("  Dev mode: frontend served separately at http://localhost:5173");
  } else {
    const distPath = path.join(__dirname, "dist");
    const indexPath = path.join(distPath, "index.html");
    const spaFallback: RequestHandler = (req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      res.sendFile(indexPath);
    };
    mainApp.use(express.static(distPath));
    mainApp.get("*", spaFallback);
    adminApp.use(express.static(distPath));
    adminApp.get("*", spaFallback);
  }

  const mainServer = http.createServer(mainApp);
  const adminServer = http.createServer(adminApp);

  const onListenError = (p: number, label: string) => (err: NodeJS.ErrnoException) => {
    if (err?.code === "EADDRINUSE") {
      console.error(`\n✗ ${label} — port ${p} is already in use (EADDRINUSE).`);
      if (p === ADMIN_PORT) {
        console.error("  The admin port must be free for Node (Vite + AdminDashboard).");
        console.error("  Do NOT set FLUTTER_WEB_PORT=9090 — Flutter and Node cannot share the same port.");
        console.error("  Fix:  fuser -k " + p + "/tcp   or choose another port in .env (ADMIN_PORT / VITE_ADMIN_PORT).");
        console.error("  Flutter: keep default 9088 or use run_dev_web.sh (7357).\n");
      }
    } else {
      console.error(err);
    }
    process.exit(1);
  };

  mainServer.on("error", onListenError(PORT, "Main (PORT)"));
  adminServer.on("error", onListenError(ADMIN_PORT, "Admin (ADMIN_PORT)"));

  mainServer.listen(PORT, "0.0.0.0", () => {
    console.log(`\n  App (Vite+API)  →  http://localhost:${PORT}/`);
  });
  adminServer.listen(ADMIN_PORT, "0.0.0.0", () => {
    console.log(`  Admin (React dashboard)  →  http://localhost:${ADMIN_PORT}/\n`);
  });

  process.on("SIGTERM", async () => {
    console.log("Shutting down...");
    await prisma.$disconnect();
    process.exit(0);
  });
}

startServer().catch(console.error);
