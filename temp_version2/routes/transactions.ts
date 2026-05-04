import { Router, Response } from 'express';
import prisma from '../lib/db.js';
import { authenticate, AuthRequest } from '../lib/auth.middleware.js';

const router = Router();

// GET /api/transactions
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { userId, role } = req.user!;
  const isAdmin = ['owner', 'platform_admin', 'finance'].includes(role);

  try {
    const where: any = isAdmin ? {} : { OR: [{ customerId: userId }, { company: { ownerId: userId } }] };
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        customer: { select: { id: true, displayName: true, email: true } },
        company: { select: { id: true, name: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
    res.json(transactions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { type, amount, category, description, companyId } = req.body;
  if (!type || amount === undefined) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const transaction = await prisma.transaction.create({
      data: {
        type,
        amount: parseFloat(amount),
        category,
        description,
        customerId: req.user!.userId,
        companyId,
      },
    });
    res.status(201).json(transaction);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
