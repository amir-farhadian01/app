import { Router, Response } from 'express';
import prisma from '../lib/db.js';
import { authenticate, AuthRequest } from '../lib/auth.middleware.js';

const router = Router();

// GET /api/services
router.get('/', async (req: AuthRequest, res: Response) => {
  const { category, providerId, search, limit = '50', offset = '0' } = req.query as any;
  try {
    const where: any = {};
    if (category) where.category = category;
    if (providerId) where.providerId = providerId;
    if (search) where.title = { contains: search, mode: 'insensitive' };

    const services = await prisma.service.findMany({
      where,
      include: {
        provider: { select: { id: true, displayName: true, avatarUrl: true, companyId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });
    res.json(services);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/services/:id
router.get('/:id', async (req, res: Response) => {
  try {
    const service = await prisma.service.findUnique({
      where: { id: req.params.id },
      include: {
        provider: { select: { id: true, displayName: true, avatarUrl: true, email: true } },
      },
    });
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json(service);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/services
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { title, category, price, description } = req.body;
  if (!title || price === undefined) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const service = await prisma.service.create({
      data: { title, category, price: parseFloat(price), description, providerId: req.user!.userId },
    });
    res.status(201).json(service);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/services/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const service = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!service) return res.status(404).json({ error: 'Not found' });
    if (service.providerId !== req.user!.userId) return res.status(403).json({ error: 'Forbidden' });

    const updated = await prisma.service.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/services/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const service = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!service) return res.status(404).json({ error: 'Not found' });
    if (service.providerId !== req.user!.userId && !['owner', 'platform_admin'].includes(req.user!.role))
      return res.status(403).json({ error: 'Forbidden' });

    await prisma.service.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
