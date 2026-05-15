import { Router, Response } from 'express';
import prisma from '../lib/db.js';
import { authenticate, AuthRequest } from '../lib/auth.middleware.js';

const router = Router();

// GET /api/posts — public list (Explorer / Services without login)
router.get('/', async (req, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize ?? '20'), 10) || 20));

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { archivedAt: null },
        include: {
          author: { select: { id: true, displayName: true, avatarUrl: true } },
          reactions: true,
          comments: {
            include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
            orderBy: { createdAt: 'asc' },
          },
          _count: { select: { reactions: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.post.count({ where: { archivedAt: null } }),
    ]);

    res.json({ data: posts, total, page, pageSize });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /api/posts/:id — single post with reactions and comments
router.get('/:id', async (req, res: Response) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
        reactions: {
          include: { user: { select: { id: true, displayName: true } } },
        },
        comments: {
          include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { reactions: true, comments: true } },
      },
    });
    if (!post || post.archivedAt) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(post);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/posts — create post with type, media, caption, location, interests
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { type, mediaUrl, thumbnailUrl, caption, serviceId, businessId, location, interests } = req.body as Record<string, unknown>;

    if (!type || !['VIDEO', 'PHOTO', 'TEXT'].includes(type as string)) {
      return res.status(400).json({ error: 'type must be VIDEO, PHOTO, or TEXT' });
    }

    const post = await prisma.post.create({
      data: {
        authorId: req.user!.userId,
        type: type as 'VIDEO' | 'PHOTO' | 'TEXT',
        mediaUrl: typeof mediaUrl === 'string' ? mediaUrl : undefined,
        thumbnailUrl: typeof thumbnailUrl === 'string' ? thumbnailUrl : undefined,
        caption: typeof caption === 'string' ? caption : undefined,
        serviceId: typeof serviceId === 'string' ? serviceId : undefined,
        businessId: typeof businessId === 'string' ? businessId : undefined,
        location: location ? (location as any) : undefined,
        interests: Array.isArray(interests) ? interests.map(String) : [],
      },
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
        _count: { select: { reactions: true, comments: true } },
      },
    });

    res.status(201).json(post);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// DELETE /api/posts/:id — soft-delete post
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (post.authorId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await prisma.post.update({
      where: { id: req.params.id },
      data: { archivedAt: new Date() },
    });

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/posts/:id/react — toggle reaction
router.post('/:id/react', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.body as { type?: string };
    if (!type) {
      return res.status(400).json({ error: 'type is required (e.g. like, love, laugh)' });
    }

    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post || post.archivedAt) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const userId = req.user!.userId;
    const existing = await prisma.postReaction.findUnique({
      where: { postId_userId: { postId: req.params.id, userId } },
    });

    if (existing) {
      // Toggle off if same type, otherwise update type
      if (existing.type === type) {
        await prisma.postReaction.delete({ where: { id: existing.id } });
        return res.json({ reacted: false });
      }
      await prisma.postReaction.update({
        where: { id: existing.id },
        data: { type },
      });
      return res.json({ reacted: true, type });
    }

    await prisma.postReaction.create({
      data: { postId: req.params.id, userId, type },
    });

    res.status(201).json({ reacted: true, type });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/posts/:id/comment — add comment
router.post('/:id/comment', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }

    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post || post.archivedAt) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = await prisma.postComment.create({
      data: {
        postId: req.params.id,
        userId: req.user!.userId,
        text: text.trim(),
      },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    res.status(201).json(comment);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /api/posts/:id/comments — get paginated comments
router.get('/:id/comments', async (req, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize ?? '20'), 10) || 20));

    const [comments, total] = await Promise.all([
      prisma.postComment.findMany({
        where: { postId: req.params.id },
        include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.postComment.count({ where: { postId: req.params.id } }),
    ]);

    res.json({ data: comments, total, page, pageSize });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
