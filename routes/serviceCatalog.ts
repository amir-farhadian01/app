import { Request, Router, Response } from 'express';
import prisma from '../lib/db.js';
import { categoryBreadcrumbs } from '../lib/categoryBreadcrumbs.js';
import { authenticate, AuthRequest } from '../lib/auth.middleware.js';
import { isServiceQuestionnaireV1 } from '../lib/serviceDefinitionTypes.js';

const router = Router();

/** Category ids: root plus all descendants (BFS). */
async function categoryIdsInSubtree(rootId: string): Promise<string[]> {
  const all = await prisma.category.findMany({ select: { id: true, parentId: true } });
  const childrenByParent = new Map<string | null, string[]>();
  for (const row of all) {
    const p = row.parentId;
    if (!childrenByParent.has(p)) childrenByParent.set(p, []);
    childrenByParent.get(p)!.push(row.id);
  }
  const out: string[] = [];
  const q: string[] = [rootId];
  const seen = new Set<string>();
  while (q.length) {
    const id = q.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    for (const c of childrenByParent.get(id) ?? []) q.push(c);
  }
  return out;
}

// GET /api/service-catalog/by-category/:categoryId — active catalog tiles (F5 wizard Step 1).
// Public read (no auth): guest order wizard. Optional ?deep=1 includes catalogs on descendant categories.
router.get('/by-category/:categoryId', async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const deep = req.query.deep === '1' || req.query.deep === 'true';
    const categoryIds = deep ? await categoryIdsInSubtree(categoryId) : [categoryId];
    const items = await prisma.serviceCatalog.findMany({
      where: { categoryId: { in: categoryIds }, isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        categoryId: true,
        lockedBookingMode: true,
      },
    });
    res.json({ items });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

// GET /api/service-catalog/:id/schema — for F5 wizard; any authenticated user
router.get('/:id/schema', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const entry = await prisma.serviceCatalog.findUnique({
      where: { id: req.params.id },
      include: { category_: { select: { id: true, name: true, parentId: true } } },
    });
    if (!entry || !entry.isActive) {
      return res.status(404).json({ error: 'Service type not found or inactive' });
    }
    const raw = entry.dynamicFieldsSchema;
    if (raw == null) {
      return res.json({
        schema: null,
        breadcrumbs: [],
        serviceCatalog: {
          id: entry.id,
          name: entry.name,
          slug: entry.slug,
          lockedBookingMode: entry.lockedBookingMode,
        },
      });
    }
    if (!isServiceQuestionnaireV1(raw)) {
      return res.status(500).json({ error: 'Invalid questionnaire in catalog' });
    }
    const breadcrumbs = await categoryBreadcrumbs(entry.categoryId, 5);
    res.json({
      schema: raw,
      breadcrumbs,
      serviceCatalog: {
        id: entry.id,
        name: entry.name,
        slug: entry.slug,
        defaultMatchingMode: entry.defaultMatchingMode,
        description: entry.description,
        category: entry.category,
        subcategory: entry.subcategory,
        lockedBookingMode: entry.lockedBookingMode,
      },
    });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

// GET /api/service-catalog/:id — public lite read for wizard review (lowest active package price + BOM snapshot).
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const catalog = await prisma.serviceCatalog.findUnique({
      where: { id },
      select: { id: true, name: true, isActive: true },
    });
    if (!catalog?.isActive) {
      return res.status(404).json({ error: 'Service type not found or inactive' });
    }
    const pkg = await prisma.providerServicePackage.findFirst({
      where: {
        serviceCatalogId: id,
        isActive: true,
        archivedAt: null,
      },
      orderBy: { finalPrice: 'asc' },
      include: {
        bom: {
          orderBy: { sortOrder: 'asc' },
          select: {
            quantity: true,
            snapshotUnitPrice: true,
            snapshotProductName: true,
          },
        },
      },
    });
    if (!pkg) {
      return res.json({ id: catalog.id, name: catalog.name });
    }
    const lines = pkg.bom.map((b) => ({
      item: b.snapshotProductName,
      qty: b.quantity,
      unitPrice: b.snapshotUnitPrice,
    }));
    return res.json({
      id: catalog.id,
      name: catalog.name,
      price: pkg.finalPrice,
      ...(lines.length > 0 ? { bom: { lines } } : {}),
    });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

export default router;
