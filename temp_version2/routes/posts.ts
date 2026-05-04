import { Router, Response } from 'express';
import prisma from '../lib/db.js';
import { authenticate, AuthRequest } from '../lib/auth.middleware.js';

const router = Router();

// GET /api/posts
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const posts = await prisma.post.findMany({
      include: {
        provider: { select: { id: true, displayName: true, avatarUrl: true, companyId: true } },
        comments: { include: { user: { select: { id: true, displayName: true, avatarUrl: true } } }, orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(posts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { imageUrl, caption } = req.body;
  if (!imageUrl) return res.status(400).json({ error: 'Missing imageUrl' });

  try {
    const post = await prisma.post.create({
      data: { imageUrl, caption, providerId: req.user!.userId },
      include: {
        provider: { select: { id: true, displayName: true, avatarUrl: true } },
        comments: true,
      },
    });
    res.status(201).json(post);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts/:id/like
router.post('/:id/like', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Not found' });

    const userId = req.user!.userId;
    const liked = post.likes.includes(userId);
    const likes = liked ? post.likes.filter((id) => id !== userId) : [...post.likes, userId];

    const updated = await prisma.post.update({ where: { id: req.params.id }, data: { likes } });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts/:id/comments
router.post('/:id/comments', authenticate, async (req: AuthRequest, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text' });

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { displayName: true } });
    const comment = await prisma.comment.create({
      data: { postId: req.params.id, userId: req.user!.userId, userName: user?.displayName, text },
    });
    res.status(201).json(comment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
