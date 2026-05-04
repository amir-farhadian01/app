import { Router, Response } from 'express';
import prisma from '../lib/db.js';
import { authenticate, AuthRequest } from '../lib/auth.middleware.js';

const router = Router();

// GET /api/chat/rooms
router.get('/rooms', authenticate, async (req: AuthRequest, res: Response) => {
  const { categoryId } = req.query as any;
  try {
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    const rooms = await prisma.chatRoom.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { lastMessageAt: 'desc' },
    });
    res.json(rooms);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/rooms/:id/messages
router.get('/rooms/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { roomId: req.params.id },
      include: { sender: { select: { id: true, displayName: true, avatarUrl: true, role: true } } },
      orderBy: { timestamp: 'asc' },
      take: 100,
    });
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat/rooms/:id/messages
router.post('/rooms/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text' });

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { displayName: true, role: true },
    });

    const message = await prisma.chatMessage.create({
      data: {
        roomId: req.params.id,
        senderId: req.user!.userId,
        senderName: user?.displayName,
        senderRole: user?.role,
        text,
      },
      include: { sender: { select: { id: true, displayName: true, avatarUrl: true, role: true } } },
    });

    await prisma.chatRoom.update({
      where: { id: req.params.id },
      data: { lastMessage: text, lastMessageAt: new Date() },
    });

    res.status(201).json(message);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
