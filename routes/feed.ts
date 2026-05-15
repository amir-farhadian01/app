import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/db.js';
import { verifyAccessToken, JwtPayload } from '../lib/jwt.js';

const router = Router();

/**
 * Optional auth middleware — attaches user if token present, continues regardless.
 */
function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      (req as any).user = verifyAccessToken(authHeader.slice(7));
    } catch {
      // token invalid — continue as unauthenticated
    }
  }
  next();
}

// GET /api/feed — personalized feed (auth optional)
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload | undefined;
    const userId = user?.userId;
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize ?? '20'), 10) || 20));

    const where: Record<string, unknown> = { archivedAt: null };

    // If user is authenticated, filter by interests
    if (userId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { gender: true },
      });
      // Future: add interest/location-based filtering
      void dbUser;
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: { select: { id: true, displayName: true, avatarUrl: true } },
          reactions: true,
          comments: { take: 3, orderBy: { createdAt: 'desc' } },
          _count: { select: { reactions: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.post.count({ where }),
    ]);

    res.json({ data: posts, total, page, pageSize });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// GET /api/feed/public — public feed (no auth)
router.get('/public', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize ?? '20'), 10) || 20));

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { archivedAt: null },
        include: {
          author: { select: { id: true, displayName: true, avatarUrl: true } },
          _count: { select: { reactions: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.post.count({ where: { archivedAt: null } }),
    ]);

    res.json({ data: posts, total, page, pageSize });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch public feed' });
  }
});

export default router;
