import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../lib/db.js';
import { authenticate, requireRole, AuthRequest } from '../lib/auth.middleware.js';

const router = Router();

// GET /api/users/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, email: true, displayName: true, role: true, status: true,
        companyId: true, isVerified: true, avatarUrl: true, bio: true,
        location: true, phone: true, mfaEnabled: true, createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/me
router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const { displayName, phone, bio, location, avatarUrl, password } = req.body;
  try {
    const data: any = {};
    if (displayName !== undefined) data.displayName = displayName;
    if (phone !== undefined) data.phone = phone;
    if (bio !== undefined) data.bio = bio;
    if (location !== undefined) data.location = location;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
    if (password) data.password = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
      select: {
        id: true, email: true, displayName: true, role: true, status: true,
        companyId: true, avatarUrl: true, bio: true, location: true, phone: true,
      },
    });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, email: true, displayName: true, role: true, status: true,
        companyId: true, isVerified: true, avatarUrl: true, bio: true, createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
