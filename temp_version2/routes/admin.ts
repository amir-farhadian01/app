import { Router, Response } from 'express';
import prisma from '../lib/db.js';
import { authenticate, isAdmin, requireRole, AuthRequest } from '../lib/auth.middleware.js';

const router = Router();
router.use(authenticate, isAdmin);

// GET /api/admin/users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, displayName: true, role: true, status: true,
        isVerified: true, companyId: true, avatarUrl: true, createdAt: true,
        mfaEnabled: true, phone: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', async (req: AuthRequest, res: Response) => {
  const { role, status, isVerified, creditLimit } = req.body;
  try {
    const data: any = {};
    if (role) data.role = role;
    if (status) data.status = status;
    if (isVerified !== undefined) data.isVerified = isVerified;
    if (creditLimit !== undefined) data.creditLimit = parseFloat(creditLimit);

    const updated = await prisma.user.update({ where: { id: req.params.id }, data });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.userId,
        action: `Updated user ${req.params.id}`,
        resourceType: 'user',
        resourceId: req.params.id,
        metadata: data,
      },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', requireRole('owner', 'platform_admin'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/kyc
router.get('/kyc', async (req: AuthRequest, res: Response) => {
  const { status } = req.query as any;
  try {
    const kyc = await prisma.kYC.findMany({
      where: status ? { status } : {},
      include: { user: { select: { id: true, displayName: true, email: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(kyc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/kyc/:id
router.put('/kyc/:id', async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  try {
    const kyc = await prisma.kYC.update({ where: { id: req.params.id }, data: { status } });
    if (status === 'verified') {
      const company = await prisma.company.findFirst({ where: { owner: { kyc: { id: req.params.id } } } });
      if (company) {
        await prisma.company.update({ where: { id: company.id }, data: { kycStatus: 'verified' } });
      }
      await prisma.user.update({ where: { id: kyc.userId }, data: { isVerified: true } });
    }
    res.json(kyc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { actor: { select: { id: true, displayName: true, email: true } } },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/transactions
router.get('/transactions', async (req: AuthRequest, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        customer: { select: { id: true, displayName: true, email: true } },
        company: { select: { id: true, name: true } },
      },
      orderBy: { timestamp: 'desc' },
    });
    res.json(transactions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const [users, companies, services, requests, contracts, openTickets] = await Promise.all([
      prisma.user.count(),
      prisma.company.count(),
      prisma.service.count(),
      prisma.request.count(),
      prisma.contract.count(),
      prisma.ticket.count({ where: { status: 'open' } }),
    ]);
    res.json({ users, companies, services, requests, contracts, openTickets });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/config
router.get('/config', async (req: AuthRequest, res: Response) => {
  try {
    let config = await prisma.systemConfig.findUnique({ where: { key: 'global' } });
    if (!config) {
      config = await prisma.systemConfig.create({
        data: { key: 'global', taxRate: 0, commissionRate: 10, paymentMethods: ['platform', 'cash'] },
      });
    }
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/config
router.put('/config', async (req: AuthRequest, res: Response) => {
  try {
    const { id: _id, key: _key, ...data } = req.body;
    const config = await prisma.systemConfig.upsert({
      where: { key: 'global' },
      update: { ...data, updatedAt: new Date() },
      create: { key: 'global', ...data },
    });
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/legal-policies
router.get('/legal-policies', async (req: AuthRequest, res: Response) => {
  try {
    const policies = await prisma.legalPolicy.findMany({ orderBy: { updatedAt: 'desc' } });
    res.json(policies);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/legal-policies
router.post('/legal-policies', async (req: AuthRequest, res: Response) => {
  const { title, content, version } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Missing fields' });
  try {
    const policy = await prisma.legalPolicy.create({ data: { title, content, version } });
    res.status(201).json(policy);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/pages
router.get('/pages', async (req: AuthRequest, res: Response) => {
  try {
    const pages = await prisma.page.findMany({ orderBy: { lastEdit: 'desc' } });
    res.json(pages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/pages
router.post('/pages', async (req: AuthRequest, res: Response) => {
  const { title, slug, content, status } = req.body;
  if (!title || !slug || !content) return res.status(400).json({ error: 'Missing fields' });
  try {
    const page = await prisma.page.create({ data: { title, slug, content, status: status || 'draft' } });
    res.status(201).json(page);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/pages/:id
router.put('/pages/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id: _id, ...data } = req.body;
    const page = await prisma.page.update({ where: { id: req.params.id }, data: { ...data, lastEdit: new Date() } });
    res.json(page);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/pages/:id
router.delete('/pages/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.page.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
