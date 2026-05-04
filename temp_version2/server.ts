import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'dotenv/config';

import prisma from './lib/db.js';
import { getRedis } from './lib/cache.js';
import { getNats } from './lib/bus.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import serviceRoutes from './routes/services.js';
import requestRoutes from './routes/requests.js';
import contractRoutes from './routes/contracts.js';
import ticketRoutes from './routes/tickets.js';
import notificationRoutes from './routes/notifications.js';
import companyRoutes from './routes/companies.js';
import postRoutes from './routes/posts.js';
import chatRoutes from './routes/chat.js';
import categoryRoutes from './routes/categories.js';
import adminRoutes from './routes/admin.js';
import systemRoutes from './routes/system.js';
import transactionRoutes from './routes/transactions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '8080');
  const isProd = process.env.NODE_ENV === 'production';

  // ─── Connect infrastructure ─────────────────────────────────────────────────
  try {
    await prisma.$connect();
    console.log('PostgreSQL connected');
  } catch (err) {
    console.error('DB connection failed:', err);
    process.exit(1);
  }

  try {
    await getRedis().ping();
    console.log('Redis ready');
  } catch {
    console.warn('Redis not available (non-fatal)');
  }

  try {
    await getNats();
  } catch {
    console.warn('NATS not available (non-fatal)');
  }

  // ─── Middleware ──────────────────────────────────────────────────────────────
  app.use(morgan('dev'));
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || true,
    credentials: true,
  }));
  app.use(helmet({ contentSecurityPolicy: false }));

  // Dynamic RP ID & Origin for WebAuthn
  app.use((req, res, next) => {
    const host = req.headers.host || '';
    const protocol = (req.headers['x-forwarded-proto'] as string) || (isProd ? 'https' : 'http');
    (req as any).rpID = host.split(':')[0];
    (req as any).origin = `${protocol}://${host}`;
    next();
  });

  // ─── API Routes ──────────────────────────────────────────────────────────────
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '2.0.0' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/requests', requestRoutes);
  app.use('/api/contracts', contractRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/companies', companyRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/system', systemRoutes);
  app.use('/api/transactions', transactionRoutes);

  // ─── Frontend ────────────────────────────────────────────────────────────────
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  // ─── Start ───────────────────────────────────────────────────────────────────
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await prisma.$disconnect();
    process.exit(0);
  });
}

startServer().catch(console.error);
