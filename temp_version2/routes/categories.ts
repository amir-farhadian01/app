import { Router, Response } from 'express';
import prisma from '../lib/db.js';
import { authenticate, requireRole, AuthRequest } from '../lib/auth.middleware.js';

const router = Router();

// GET /api/categories
router.get('/', async (req: AuthRequest, res: Response) => {
  const { parentId } = req.query as any;
  try {
    const where: any = {};
    if (parentId === 'null' || parentId === '') where.parentId = null;
    else if (parentId) where.parentId = parentId;

    const categories = await prisma.category.findMany({
      where,
      include: { children: true },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categories (admin only)
router.post('/', authenticate, requireRole('owner', 'platform_admin'), async (req: AuthRequest, res: Response) => {
  const { name, parentId, description, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing name' });

  try {
    const category = await prisma.category.create({
      data: { name, parentId: parentId || null, description, icon },
    });
    res.status(201).json(category);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categories/:id (admin only)
router.put('/:id', authenticate, requireRole('owner', 'platform_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const updated = await prisma.category.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categories/:id (admin only)
router.delete('/:id', authenticate, requireRole('owner', 'platform_admin'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
