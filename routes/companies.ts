import { Router, Response } from 'express';
import prisma from '../lib/db.js';
import { authenticate, AuthRequest } from '../lib/auth.middleware.js';

const router = Router();

// GET /api/companies
router.get('/', async (req: AuthRequest, res: Response) => {
  const { kycStatus, search } = req.query as any;
  try {
    const where: any = {};
    if (kycStatus) where.kycStatus = kycStatus;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const companies = await prisma.company.findMany({
      where,
      include: {
        owner: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        members: { include: { user: { select: { id: true, displayName: true, email: true, avatarUrl: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(companies);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/companies/:id
router.get('/:id', async (req, res: Response) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        members: { include: { user: { select: { id: true, displayName: true, email: true, avatarUrl: true, role: true } } } },
      },
    });
    if (!company) return res.status(404).json({ error: 'Not found' });
    res.json(company);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/companies/by-slug/:slug
router.get('/by-slug/:slug', async (req, res: Response) => {
  try {
    const company = await prisma.company.findUnique({
      where: { slug: req.params.slug },
      include: {
        owner: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        members: { include: { user: { select: { id: true, displayName: true, email: true, avatarUrl: true } } } },
      },
    });
    if (!company) return res.status(404).json({ error: 'Not found' });
    res.json(company);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/companies
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, slug, type, about, phone, address, website, socialLinks } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing name' });

  try {
    const existing = await prisma.company.findUnique({ where: { ownerId: req.user!.userId } });
    if (existing) return res.status(409).json({ error: 'Already have a company' });

    const company = await prisma.company.create({
      data: { name, slug, type: type || 'solo', about, phone, address, website, socialLinks, ownerId: req.user!.userId },
    });

    // Update user companyId
    await prisma.user.update({ where: { id: req.user!.userId }, data: { companyId: company.id } });

    res.status(201).json(company);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/companies/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const company = await prisma.company.findUnique({ where: { id: req.params.id } });
    if (!company) return res.status(404).json({ error: 'Not found' });

    const isOwner = company.ownerId === req.user!.userId;
    const isAdmin = ['owner', 'platform_admin'].includes(req.user!.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const { id: _id, ownerId: _ownerId, createdAt: _c, updatedAt: _u, ...data } = req.body;
    const updated = await prisma.company.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/companies/:id/members
router.post('/:id/members', authenticate, async (req: AuthRequest, res: Response) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    await prisma.companyUser.create({ data: { companyId: req.params.id, userId } });
    await prisma.user.update({ where: { id: userId }, data: { companyId: req.params.id } });
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/companies/:id/members/:userId
router.delete('/:id/members/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.companyUser.delete({
      where: { companyId_userId: { companyId: req.params.id, userId: req.params.userId } },
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
