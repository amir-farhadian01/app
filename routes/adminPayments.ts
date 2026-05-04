import { Router, type Response } from 'express';
import prisma from '../lib/db.js';
import { authenticate, isAdmin, type AuthRequest } from '../lib/auth.middleware.js';

const router = Router();
router.use(authenticate, isAdmin);

function extractOrderId(description: string | null): string | null {
  if (!description) return null;
  const m = /order:([a-z0-9]+)/i.exec(description);
  return m?.[1] ?? null;
}

router.get('/ledger', async (req: AuthRequest, res: Response) => {
  try {
    const orderId = typeof req.query.orderId === 'string' ? req.query.orderId.trim() : '';
    const txs = await prisma.transaction.findMany({
      where: {
        category: { in: ['order_payment_session', 'order_payment_capture'] },
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
    if (!tx || !['order_payment_session', 'order_payment_capture'].includes(tx.category ?? '')) {
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
