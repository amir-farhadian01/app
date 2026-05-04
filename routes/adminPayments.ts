import { Router, type Response } from 'express';
import prisma from '../lib/db.js';
import { authenticate, isAdmin, type AuthRequest } from '../lib/auth.middleware.js';

const router = Router();
router.use(authenticate, isAdmin);

const PAYMENT_LEDGER_CATEGORIES = ['order_payment_session', 'order_payment_capture'] as const;
const PAYMENT_ROW_CATEGORIES = [
  'order_payment_session',
  'order_payment_capture',
  'order_payment_refund',
  'order_payment_failed',
] as const;

const PLATFORM_FEE_PERCENT = 10;

function extractOrderId(description: string | null): string | null {
  if (!description) return null;
  const m = /order:([a-z0-9]+)/i.exec(description);
  return m?.[1] ?? null;
}

function userDisplayName(u: {
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
} | null): string {
  if (!u) return '—';
  const d = u.displayName?.trim();
  if (d) return d;
  const parts = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  if (parts) return parts;
  return u.email;
}

type RowStatus = 'PENDING' | 'CAPTURED' | 'REFUNDED' | 'FAILED';

function statusFromCategory(category: string | null): RowStatus {
  const c = (category ?? '').toLowerCase();
  if (c === 'order_payment_failed') return 'FAILED';
  if (c === 'order_payment_refund') return 'REFUNDED';
  if (c === 'order_payment_capture') return 'CAPTURED';
  return 'PENDING';
}

/** Paginated payment rows derived from ledger transactions (no Stripe SDK). */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const pageRaw = typeof req.query.page === 'string' ? parseInt(req.query.page, 10) : 1;
    const pageSizeRaw = typeof req.query.pageSize === 'string' ? parseInt(req.query.pageSize, 10) : 20;
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const pageSize = Math.min(100, Math.max(1, Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? pageSizeRaw : 20));

    const txs = await prisma.transaction.findMany({
      where: { category: { in: [...PAYMENT_ROW_CATEGORIES] } },
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        timestamp: true,
        category: true,
        amount: true,
        description: true,
      },
      take: 8000,
    });

    const byOrder = new Map<
      string,
      { orderId: string; lastAt: Date; lastCategory: string | null; amount: number; lastTxId: string }
    >();
    for (const tx of txs) {
      const oid = extractOrderId(tx.description);
      if (!oid) continue;
      const cur = byOrder.get(oid);
      if (!cur || tx.timestamp > cur.lastAt) {
        byOrder.set(oid, {
          orderId: oid,
          lastAt: tx.timestamp,
          lastCategory: tx.category,
          amount: tx.amount,
          lastTxId: tx.id,
        });
      }
    }

    const sortedIds = [...byOrder.values()].sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
    const total = sortedIds.length;
    const slice = sortedIds.slice((page - 1) * pageSize, page * pageSize);
    const orderIds = slice.map((s) => s.orderId);

    const orders = orderIds.length
      ? await prisma.order.findMany({
          where: { id: { in: orderIds } },
          select: {
            id: true,
            customer: {
              select: { id: true, email: true, displayName: true, firstName: true, lastName: true },
            },
            matchedProvider: {
              select: { id: true, email: true, displayName: true, firstName: true, lastName: true },
            },
            matchedWorkspace: { select: { id: true, name: true } },
            serviceCatalog: { select: { id: true, name: true } },
            orderContract: {
              select: {
                currentVersion: { select: { amount: true, currency: true } },
              },
            },
          },
        })
      : [];
    const orderMap = new Map(orders.map((o) => [o.id, o]));

    const items = slice.map((row) => {
      const o = orderMap.get(row.orderId);
      const subtotal =
        o?.orderContract?.currentVersion?.amount ?? row.amount ?? 0;
      const status = statusFromCategory(row.lastCategory);
      return {
        orderId: row.orderId,
        customerName: userDisplayName(o?.customer ?? null),
        providerName: o?.matchedWorkspace?.name?.trim() || userDisplayName(o?.matchedProvider ?? null),
        amount: subtotal,
        currency: o?.orderContract?.currentVersion?.currency ?? 'CAD',
        status,
        date: row.lastAt.toISOString(),
        lastTransactionId: row.lastTxId,
      };
    });

    return res.json({ items, page, pageSize, total });
  } catch (err: unknown) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/orders/:orderId', async (req: AuthRequest, res: Response) => {
  try {
    const orderId = req.params.orderId?.trim();
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });

    const txs = await prisma.transaction.findMany({
      where: {
        category: { in: [...PAYMENT_ROW_CATEGORIES] },
        description: { contains: `order:${orderId}` },
      },
      orderBy: { timestamp: 'asc' },
      select: { id: true, timestamp: true, category: true, amount: true, description: true },
    });
    if (!txs.length) {
      return res.status(404).json({ error: 'No payment records for this order' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customer: {
          select: { id: true, email: true, displayName: true, firstName: true, lastName: true },
        },
        matchedProvider: {
          select: { id: true, email: true, displayName: true, firstName: true, lastName: true },
        },
        matchedWorkspace: { select: { id: true, name: true } },
        serviceCatalog: { select: { id: true, name: true } },
        orderContract: {
          select: {
            currentVersion: { select: { amount: true, currency: true } },
          },
        },
      },
    });

    const last = txs[txs.length - 1]!;
    const rowStatus = statusFromCategory(last.category);
    const subtotal = order?.orderContract?.currentVersion?.amount ?? last.amount ?? 0;
    const platformFeeAmount = (subtotal * PLATFORM_FEE_PERCENT) / 100;
    const providerPayout = Math.max(0, subtotal - platformFeeAmount);

    const sessionTx = txs.find((t) => (t.category ?? '').toLowerCase() === 'order_payment_session');
    const captureTx = txs.find((t) => (t.category ?? '').toLowerCase() === 'order_payment_capture');

    const audit = await prisma.auditLog.findMany({
      where: {
        resourceType: 'order',
        resourceId: orderId,
        action: { in: ['PAYMENT_SESSION_CREATED', 'PAYMENT_CAPTURED'] },
      },
      orderBy: { timestamp: 'asc' },
      take: 50,
      include: { actor: { select: { id: true, email: true, displayName: true } } },
    });

    return res.json({
      orderId,
      customerName: userDisplayName(order?.customer ?? null),
      providerName:
        order?.matchedWorkspace?.name?.trim() || userDisplayName(order?.matchedProvider ?? null),
      serviceName: order?.serviceCatalog?.name ?? '—',
      currency: order?.orderContract?.currentVersion?.currency ?? 'CAD',
      status: rowStatus,
      breakdown: {
        subtotal,
        platformFeePercent: PLATFORM_FEE_PERCENT,
        platformFeeAmount,
        providerPayout,
      },
      timeline: {
        sessionCreatedAt: sessionTx?.timestamp.toISOString() ?? null,
        capturedAt: captureTx?.timestamp.toISOString() ?? null,
        settledAt: null as string | null,
      },
      audit,
    });
  } catch (err: unknown) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/ledger', async (req: AuthRequest, res: Response) => {
  try {
    const orderId = typeof req.query.orderId === 'string' ? req.query.orderId.trim() : '';
    const txs = await prisma.transaction.findMany({
      where: {
        category: { in: [...PAYMENT_LEDGER_CATEGORIES] },
        ...(orderId ? { description: { contains: `order:${orderId}` } } : {}),
      },
      include: {
        customer: { select: { id: true, email: true, displayName: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 300,
    });
    const orderIds = [...new Set(txs.map((tx) => extractOrderId(tx.description)).filter(Boolean))] as string[];
    const orders = orderIds.length
      ? await prisma.order.findMany({
          where: { id: { in: orderIds } },
          select: {
            id: true,
            status: true,
            phase: true,
            orderContract: {
              select: {
                currentVersionId: true,
                currentVersion: { select: { status: true, amount: true, currency: true } },
              },
            },
          },
        })
      : [];
    const orderMap = new Map(orders.map((o) => [o.id, o]));
    return res.json({
      items: txs.map((tx) => {
        const resolvedOrderId = extractOrderId(tx.description);
        return {
          id: tx.id,
          timestamp: tx.timestamp,
          category: tx.category,
          amount: tx.amount,
          type: tx.type,
          description: tx.description,
          customer: tx.customer,
          company: tx.company,
          order: resolvedOrderId ? orderMap.get(resolvedOrderId) ?? null : null,
        };
      }),
    });
  } catch (err: unknown) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/ledger/:transactionId', async (req: AuthRequest, res: Response) => {
  try {
    const transactionId = req.params.transactionId;
    if (!transactionId) return res.status(400).json({ error: 'transactionId is required' });
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        customer: { select: { id: true, email: true, displayName: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
      },
    });
    if (!tx || ![...PAYMENT_LEDGER_CATEGORIES].includes((tx.category ?? '') as (typeof PAYMENT_LEDGER_CATEGORIES)[number])) {
      return res.status(404).json({ error: 'Payment ledger record not found' });
    }
    const orderId = extractOrderId(tx.description);
    const order = orderId
      ? await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            orderContract: {
              include: {
                currentVersion: true,
                versions: { orderBy: { versionNumber: 'desc' }, take: 20 },
                events: { orderBy: { createdAt: 'desc' }, take: 50 },
              },
            },
          },
        })
      : null;
    const audit = await prisma.auditLog.findMany({
      where: { resourceType: 'order', resourceId: orderId ?? '' },
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: { actor: { select: { id: true, email: true, displayName: true } } },
    });
    return res.json({ transaction: tx, order, audit });
  } catch (err: unknown) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
