import { Router, Response } from 'express';
import { BookingMode, Prisma } from '@prisma/client';
import prisma from '../lib/db.js';
import { authenticate, isAdmin, requireRole, AuthRequest } from '../lib/auth.middleware.js';
import { isServiceQuestionnaireV1, type ServiceQuestionnaireV1 } from '../lib/serviceDefinitionTypes.js';

function toJsonValue(s: ServiceQuestionnaireV1): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(s)) as Prisma.InputJsonValue;
}

const router = Router();
router.use(authenticate, isAdmin);

const MAX_PAGE = 100;

const SORTABLE = new Set(['name', 'createdAt', 'updatedAt', 'defaultMatchingMode', 'isActive', 'category']);

function parsePage(req: AuthRequest) {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.min(MAX_PAGE, Math.max(1, parseInt(String(req.query.pageSize ?? '20'), 10) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function parseSort(req: AuthRequest) {
  const sortBy = typeof req.query.sortBy === 'string' && SORTABLE.has(req.query.sortBy) ? req.query.sortBy : 'name';
  const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';
  return { sortBy, sortDir };
}

function parseCommaList(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string' && x.length > 0);
  if (typeof v === 'string' && v.trim()) {
    return v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { skip, pageSize, page } = parsePage(req);
    const { sortBy, sortDir } = parseSort(req);
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : '';
    const categoryIds = parseCommaList(req.query.categoryIds);
    const matchModes = parseCommaList(req.query.defaultMatchingMode);
    const isActiveQ = req.query.isActive;
    const where: Prisma.ServiceCatalogWhereInput = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (categoryIds.length) {
      where.categoryId = { in: categoryIds };
    } else if (categoryId) {
      where.categoryId = categoryId;
    }
    if (matchModes.length) {
      where.defaultMatchingMode = { in: matchModes };
    }
    if (isActiveQ === 'true') where.isActive = true;
    else if (isActiveQ === 'false') where.isActive = false;

    const d = (sortDir === 'asc' ? 'asc' : 'desc') as Prisma.SortOrder;
    const orderBy: Prisma.ServiceCatalogOrderByWithRelationInput = (() => {
      if (sortBy === 'category') return { category: d };
      if (sortBy === 'name') return { name: d };
      if (sortBy === 'createdAt') return { createdAt: d };
      if (sortBy === 'updatedAt') return { updatedAt: d };
      if (sortBy === 'defaultMatchingMode') return { defaultMatchingMode: d };
      if (sortBy === 'isActive') return { isActive: d };
      return { name: 'asc' };
    })();

    const whereForCategoryFacet = {
      AND: [where, { categoryId: { not: null } }],
    } as unknown as Prisma.ServiceCatalogWhereInput;
    // Prisma 5.22: groupBy `where` + `OR` can trigger TS2615 circular mapped types; runtime shape is valid.
    const wAgg = where as Prisma.ServiceCatalogWhereInput;
    const [total, items, isActiveGroups, categoryGroups] = await prisma.$transaction([
      prisma.serviceCatalog.count({ where }),
      prisma.serviceCatalog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          category_: { select: { id: true, name: true, parentId: true } },
          _count: { select: { services: true } },
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.serviceCatalog as any).groupBy({ by: ['isActive'], _count: { _all: true }, where: wAgg }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.serviceCatalog as any).groupBy({
        by: ['categoryId'],
        _count: { _all: true },
        where: whereForCategoryFacet,
      }),
    ]);

    res.json({
      items,
      total,
      facets: {
        isActive: Object.fromEntries(isActiveGroups.map((g) => [String(g.isActive), g._count._all])),
        byCategory: categoryGroups.map((g) => ({ categoryId: g.categoryId, count: g._count._all })),
      },
      page,
      pageSize,
    });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

router.get('/:id/preview', async (req: AuthRequest, res: Response) => {
  try {
    const row = await prisma.serviceCatalog.findUnique({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ error: 'Not found' });
    const raw = row.dynamicFieldsSchema;
    if (raw != null && !isServiceQuestionnaireV1(raw)) {
      return res.status(400).json({ error: 'Invalid stored questionnaire' });
    }
    res.json({ schema: row.dynamicFieldsSchema, sampleAnswers: {} });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const row = await prisma.serviceCatalog.findUnique({
      where: { id: req.params.id },
      include: {
        category_: true,
        _count: { select: { services: true } },
      },
    });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const b = req.body as Record<string, unknown>;
    const name = b.name;
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const category = typeof b.category === 'string' ? b.category : '';
    if (!category) return res.status(400).json({ error: 'category (legacy) is required' });
    const subcategory = b.subcategory === undefined || b.subcategory === null ? null : String(b.subcategory);
    const complianceTags = Array.isArray(b.complianceTags)
      ? (b.complianceTags as unknown[]).filter((x): x is string => typeof x === 'string')
      : [];
    const categoryId = b.categoryId == null || b.categoryId === '' ? null : String(b.categoryId);
    if (categoryId) {
      const c = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!c) return res.status(400).json({ error: 'categoryId not found' });
    }
    const defaultMatchingMode =
      typeof b.defaultMatchingMode === 'string' && b.defaultMatchingMode
        ? b.defaultMatchingMode
        : 'manual_review';
    const description =
      b.description === undefined || b.description === null ? null : String(b.description);
    const slug = b.slug === undefined || b.slug === null || b.slug === '' ? null : String(b.slug);
    if (slug) {
      const clash = await prisma.serviceCatalog.findFirst({ where: { slug } });
      if (clash) return res.status(400).json({ error: 'slug already in use' });
    }
    const isActive = typeof b.isActive === 'boolean' ? b.isActive : true;
    const dynamicFieldsSchema = b.dynamicFieldsSchema;
    const createData: Prisma.ServiceCatalogUncheckedCreateInput = {
      name: name.trim(),
      category,
      subcategory: subcategory ?? null,
      complianceTags,
      categoryId,
      defaultMatchingMode,
      description: description ?? null,
      slug,
      isActive,
    };
    if (dynamicFieldsSchema === null) {
      createData.dynamicFieldsSchema = Prisma.JsonNull;
    } else if (dynamicFieldsSchema !== undefined) {
      if (!isServiceQuestionnaireV1(dynamicFieldsSchema)) {
        return res.status(400).json({ error: 'dynamicFieldsSchema must be ServiceQuestionnaireV1' });
      }
      createData.dynamicFieldsSchema = toJsonValue(dynamicFieldsSchema);
    }
    const created = await prisma.serviceCatalog.create({
      data: createData,
      include: {
        category_: { select: { id: true, name: true, parentId: true } },
        _count: { select: { services: true } },
      },
    });
    res.status(201).json(created);
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const b = req.body as Record<string, unknown>;
    const existing = await prisma.serviceCatalog.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const data: Prisma.ServiceCatalogUncheckedUpdateInput = {};
    if (typeof b.name === 'string') data.name = b.name.trim();
    if (typeof b.category === 'string') data.category = b.category;
    if (b.subcategory !== undefined) data.subcategory = b.subcategory === null ? null : String(b.subcategory);
    if (Array.isArray(b.complianceTags)) {
      data.complianceTags = (b.complianceTags as unknown[]).filter((x): x is string => typeof x === 'string');
    }
    if (b.categoryId !== undefined) {
      const cid = b.categoryId === null || b.categoryId === '' ? null : String(b.categoryId);
      data.categoryId = cid;
      if (cid) {
        const c = await prisma.category.findUnique({ where: { id: cid } });
        if (!c) return res.status(400).json({ error: 'categoryId not found' });
      }
    }
    if (typeof b.defaultMatchingMode === 'string' && b.defaultMatchingMode) {
      data.defaultMatchingMode = b.defaultMatchingMode;
    }
    if (b.description !== undefined) {
      data.description = b.description === null ? null : String(b.description);
    }
    if (b.slug !== undefined) {
      const slug = b.slug === null || b.slug === '' ? null : String(b.slug);
      if (slug) {
        const clash = await prisma.serviceCatalog.findFirst({
          where: { slug, id: { not: req.params.id } },
        });
        if (clash) return res.status(400).json({ error: 'slug already in use' });
      }
      data.slug = slug;
    }
    if (typeof b.isActive === 'boolean') data.isActive = b.isActive;
    if (b.lockedBookingMode !== undefined) {
      const v = b.lockedBookingMode;
      const newLock: string | null =
        v === null || (typeof v === 'string' && v.trim() === '') ? null : String(v);
      if (newLock != null && newLock !== 'auto_appointment' && newLock !== 'negotiation') {
        return res.status(400).json({ error: 'lockedBookingMode must be auto_appointment, negotiation, or null' });
      }
      if (newLock != null) {
        const whereConflict: Prisma.ProviderServicePackageWhereInput =
          newLock === 'auto_appointment'
            ? {
                serviceCatalogId: existing.id,
                bookingMode: BookingMode.negotiation,
              }
            : {
                serviceCatalogId: existing.id,
                bookingMode: BookingMode.auto_appointment,
              };
        const conflicts = await prisma.providerServicePackage.findMany({
          where: whereConflict,
          select: { id: true },
        });
        if (conflicts.length > 0) {
          return res.status(409).json({
            error:
              'Cannot lock catalog booking mode: existing provider packages have an explicit booking mode in conflict with this value',
            conflictCount: conflicts.length,
            packageIds: conflicts.map((c) => c.id),
          });
        }
      }
      data.lockedBookingMode = newLock;
    }
    if (b.dynamicFieldsSchema !== undefined) {
      if (b.dynamicFieldsSchema === null) {
        data.dynamicFieldsSchema = Prisma.JsonNull;
      } else if (isServiceQuestionnaireV1(b.dynamicFieldsSchema)) {
        data.dynamicFieldsSchema = toJsonValue(b.dynamicFieldsSchema);
      } else {
        return res.status(400).json({ error: 'dynamicFieldsSchema must be ServiceQuestionnaireV1' });
      }
    }

    const updated = await prisma.serviceCatalog.update({
      where: { id: req.params.id },
      data,
      include: {
        category_: { select: { id: true, name: true, parentId: true } },
        _count: { select: { services: true } },
      },
    });
    res.json(updated);
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

router.delete(
  '/:id',
  requireRole('owner', 'platform_admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      await prisma.serviceCatalog.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err: unknown) {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
    }
  },
);

export default router;
