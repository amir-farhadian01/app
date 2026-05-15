import { Router, Response } from 'express';
import prisma from '../lib/db.js';
import { authenticate, AuthRequest } from '../lib/auth.middleware.js';

const router = Router();

/**
 * Haversine formula to calculate distance (km) between two lat/lng points.
 * Uncomment and use when lat/lng fields are added to the User model.
 *
 * TODO: Add lat/lng to User model via Prisma migration for real geo-filtering.
 *       Currently UserAddress has lat/lng but is a separate table; for MVP we
 *       return all providers sorted by rating.
 */
// function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
//   const R = 6371; // Earth radius in km
//   const dLat = (lat2 - lat1) * Math.PI / 180;
//   const dLon = (lon2 - lon1) * Math.PI / 180;
//   const a =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
//   return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
// }

/**
 * GET /api/providers/nearby
 *
 * Query params:
 *   lat   (number, optional) — user's latitude  (reserved for future geo-filtering)
 *   lng   (number, optional) — user's longitude (reserved for future geo-filtering)
 *   limit (number, optional, default 20, max 50)
 *
 * Returns providers (users with role='provider') who have at least one active service,
 * with their top services and a placeholder distance field.
 *
 * NOTE: The User model currently lacks lat/lng fields. Once added via migration,
 *       uncomment the Haversine function above and apply real distance-based sorting.
 *       For now, all providers are returned sorted by their highest-rated service.
 */
router.get('/nearby', async (req: AuthRequest, res: Response) => {
  try {
    // Parse query params (lat/lng accepted but not used for filtering yet)
    const _lat = parseFloat(String(req.query.lat ?? '0'));
    const _lng = parseFloat(String(req.query.lng ?? '0'));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));

    // Fetch providers with their services
    const providers = await prisma.user.findMany({
      where: {
        role: 'provider',
        status: 'active',
        services: { some: {} }, // must have at least one service
      },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        // lat: true,   // uncomment when field exists in schema
        // lng: true,
        services: {
          select: {
            id: true,
            title: true,
            category: true,
            price: true,
            rating: true,
            reviewsCount: true,
          },
          orderBy: { rating: 'desc' },
          take: 3,
        },
      },
      take: limit,
    });

    // Shape response to match Flutter model expectations
    const result = providers.map((p) => {
      const topService = p.services[0] ?? null;
      return {
        id: p.id,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        category: topService?.category ?? 'General',
        rating: topService?.rating ?? 0,
        reviewsCount: topService?.reviewsCount ?? 0,
        distance: null, // TODO: calculate real distance when lat/lng added to User
        services: p.services,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('[providers/nearby]', error);
    res.status(500).json({ error: 'Failed to fetch nearby providers' });
  }
});

export default router;
