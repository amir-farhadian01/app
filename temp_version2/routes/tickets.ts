import { Router, Response } from 'express';
import prisma from '../lib/db.js';
import { authenticate, AuthRequest } from '../lib/auth.middleware.js';

const router = Router();

// GET /api/tickets
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { userId, role } = req.user!;
  const isAdmin = ['owner', 'platform_admin', 'support'].includes(role);
  try {
    const where: any = isAdmin ? {} : { creatorId: userId };
    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        creator: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        recipient: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tickets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        creator: { select: { id: true, displayName: true, avatarUrl: true } },
        recipient: { select: { id: true, displayName: true } },
      },
    });
    if (!ticket) return res.status(404).json({ error: 'Not found' });
    res.json(ticket);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { subject, type, recipientId, message } = req.body;
  if (!subject || !type) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { displayName: true } });
    const ticket = await prisma.ticket.create({
      data: {
        creatorId: req.user!.userId,
        recipientId,
        subject,
        type,
        messages: message ? [{ text: message, senderId: req.user!.userId, senderName: user?.displayName, timestamp: new Date().toISOString() }] : [],
      },
    });
    res.status(201).json(ticket);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tickets/:id/message
router.put('/:id/message', authenticate, async (req: AuthRequest, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text' });

  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) return res.status(404).json({ error: 'Not found' });

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { displayName: true } });
    const messages: any[] = (ticket.messages as any[]) || [];
    messages.push({ text, senderId: req.user!.userId, senderName: user?.displayName, timestamp: new Date().toISOString() });

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { messages, status: 'in_progress' },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tickets/:id/status
router.put('/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  try {
    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
