import { Router, Request, Response } from 'express';
import prisma from '../lib/db.js';
import { authenticate, AuthRequest } from '../lib/auth.middleware.js';

const router = Router();

// GET /api/posts — public (Explorer / Services without login)
router.get('/', async (req: Request, res: Response) => {
  try {
    const posts = await prisma.post.findMany({
      include: {
        provider: { select: { id: true, displayName: true, avatarUrl: true, companyId: true } },
        comments: { include: { user: { select: { id: true, displayName: true, avatarUrl: true } } }, orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const providerIds = [...new Set(posts.map((p) => p.providerId))];
    const orderCounts =
      providerIds.length === 0
        ? []
        : await prisma.request.groupBy({
            by: ['providerId'],
            where: { providerId: { in: providerIds } },
            _count: { _all: true },
          });
    const orderByProvider = new Map(orderCounts.map((r) => [r.providerId, r._count._all]));
    const payload = posts.map((p) => ({
      ...p,
      likeCount: p.likes.length,
      commentCount: p.comments.length,
      orderCount: orderByProvider.get(p.providerId) ?? 0,
      // Explorer-only engagement hint until explicit shares are modeled.
      shareCount: Math.max(p.comments.length, Math.floor(p.likes.length * 0.35)),
    }));
    res.json(payload);
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
