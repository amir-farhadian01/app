import { Router, Response } from 'express';
import { MatchAttemptStatus, OrderEntryPoint, OrderPhase, OrderStatus, Prisma } from '@prisma/client';
import prisma from '../lib/db.js';
import { publish } from '../lib/bus.js';
import { authenticate, AuthRequest } from '../lib/auth.middleware.js';
import { categoryBreadcrumbs } from '../lib/categoryBreadcrumbs.js';
import { snapshotSchemaForOrder } from '../lib/orderSnapshot.js';
import { photosJsonToUploadRows } from '../lib/orderPhotosForValidate.js';
import { isServiceQuestionnaireV1 } from '../lib/serviceDefinitionTypes.js';
import { validateServiceAnswers } from '../lib/serviceQuestionnaireValidate.js';
import { phaseFromStatus, phaseListWhere } from '../lib/orderPhase.js';
import { countOrderPhaseFacets } from '../lib/orderPhaseFacets.js';
import { findEligiblePackagesForOffer } from '../lib/matching/eligibility.js';
import { autoMatchOffer } from '../lib/matching/orchestrator.js';
import {
  expireStaleAttempts,
  roundRobinInviteOffer,
  RoundRobinValidationError,
} from '../lib/matching/roundRobin.js';
import { assertWorkspaceMember, listMyWorkspaces, WorkspaceAccessError } from '../lib/workspaceAccess.js';
import { getOrderPaymentSummary } from '../lib/orderPayments.js';

const router = Router();

const DEFAULT_PHASES: OrderPhase[] = [OrderPhase.offer, OrderPhase.order, OrderPhase.job];

const SCHEDULE_FLEX = new Set(['asap', 'this_week', 'specific']);

function canViewOrderAsStaff(role: string): boolean {
  return ['owner', 'platform_admin', 'support', 'finance'].includes(role);
}

async function canViewOrderAsMatchedParty(
  userId: string,
  order: { matchedProviderId: string | null; matchedWorkspaceId: string | null },
): Promise<boolean> {
  if (order.matchedProviderId && order.matchedProviderId === userId) return true;
  if (!order.matchedWorkspaceId) return false;
  try {
    await assertWorkspaceMember(userId, order.matchedWorkspaceId);
    return true;
  } catch (e) {
    if (e instanceof WorkspaceAccessError) return false;
    throw e;
  }
}

function pickStr(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

function pickQueryStr(q: AuthRequest['query'], key: string): string | undefined {
  const v = q[key];
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (Array.isArray(v) && typeof v[0] === 'string' && v[0].trim()) return v[0].trim();
  return undefined;
}

function toStrArray(x: unknown): string[] {
  if (x == null) return [];
  if (Array.isArray(x)) return x.filter((a): a is string => typeof a === 'string' && a.length > 0);
  if (typeof x === 'string' && x.length) return [x];
  return [];
}

const ORDER_PHASES = new Set<string>(['offer', 'order', 'job']);

function parsePhaseArray(q: AuthRequest['query']): OrderPhase[] {
  const raw = [
    ...toStrArray((q as Record<string, unknown>)['phase']),
    ...toStrArray((q as Record<string, unknown>)['phase[]']),
  ].filter((s) => ORDER_PHASES.has(s));
  return raw.map((p) => p as OrderPhase);
}

function parseIncludeDraftsCustomer(q: AuthRequest['query']): boolean {
  if (pickQueryStr(q, 'includeDrafts') === 'false') return false;
  return true;
}

function parseStatusArray(q: AuthRequest['query']): OrderStatus[] {
  const raw = [
    ...(Array.isArray(q.status) ? q.status : q.status != null ? [q.status] : []),
    ...(Array.isArray((q as Record<string, unknown>)['status[]'])
      ? ((q as Record<string, unknown>)['status[]'] as string[])
      : []),
  ];
  const allowed = new Set<string>(Object.values(OrderStatus));
  return raw
    .flatMap((x) => (typeof x === 'string' ? [x] : []))
    .filter((s) => allowed.has(s)) as OrderStatus[];
}

function parseIntDefault(s: string | undefined, def: number, min: number, max: number): number {
  const n = s != null && s !== '' ? Number.parseInt(s, 10) : def;
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function parseEntryPoint(raw: unknown): OrderEntryPoint | null {
  if (raw === OrderEntryPoint.explorer) return OrderEntryPoint.explorer;
  if (raw === OrderEntryPoint.ai_suggestion) return OrderEntryPoint.ai_suggestion;
  if (raw === OrderEntryPoint.direct) return OrderEntryPoint.direct;
  if (typeof raw === 'string') {
    if (raw === 'explorer') return OrderEntryPoint.explorer;
    if (raw === 'ai_suggestion') return OrderEntryPoint.ai_suggestion;
    if (raw === 'direct') return OrderEntryPoint.direct;
  }
  return null;
}

function asAnswersRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) return { ...(v as Record<string, unknown>) };
  return {};
}

/** Prisma.Json field write: plain objects need a round-trip for `InputJsonValue`. */
function answersToJson(answers: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(answers)) as Prisma.InputJsonValue;
}

function normalizePhotosJson(v: unknown): Prisma.InputJsonValue {
  if (!Array.isArray(v)) return [];
  const out: Prisma.InputJsonValue[] = [];
  for (const p of v) {
    if (!p || typeof p !== 'object') continue;
    const o = p as Record<string, unknown>;
    out.push({
      url: typeof o.url === 'string' ? o.url : '',
      fileName: typeof o.fileName === 'string' ? o.fileName : '',
      mimeType: typeof o.mimeType === 'string' ? o.mimeType : 'application/octet-stream',
      sizeBytes: typeof o.sizeBytes === 'number' && Number.isFinite(o.sizeBytes) ? o.sizeBytes : 0,
      ...(typeof o.fieldId === 'string' ? { fieldId: o.fieldId } : {}),
    });
  }
  return out;
}

async function orderToCustomerJson(order: {
  id: string;
  customerId: string;
  serviceCatalogId: string;
  schemaSnapshot: Prisma.JsonValue;
  answers: Prisma.JsonValue;
  photos: Prisma.JsonValue;
  description: string;
  descriptionAiAssisted: boolean;
  scheduledAt: Date | null;
  scheduleFlexibility: string;
  address: string;
  locationLat: number | null;
  locationLng: number | null;
  entryPoint: OrderEntryPoint;
  status: OrderStatus;
  phase: OrderPhase | null;
  matchedPackageId?: string | null;
  matchedProviderId?: string | null;
  matchedWorkspaceId?: string | null;
  autoMatchExhausted?: boolean | null;
  matchingExpiresAt?: Date | null;
  customerPicks?: Prisma.JsonValue | null;
  cancelReason: string | null;
  cancelledAt: Date | null;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: order.id,
    customerId: order.customerId,
    serviceCatalogId: order.serviceCatalogId,
    schemaSnapshot: order.schemaSnapshot,
    answers: order.answers,
    photos: order.photos,
    description: order.description,
    descriptionAiAssisted: order.descriptionAiAssisted,
    scheduledAt: order.scheduledAt?.toISOString() ?? null,
    scheduleFlexibility: order.scheduleFlexibility,
    address: order.address,
    locationLat: order.locationLat,
    locationLng: order.locationLng,
    entryPoint: order.entryPoint,
    status: order.status,
    phase: order.phase,
    matchedPackageId: order.matchedPackageId ?? null,
    matchedProviderId: order.matchedProviderId ?? null,
    matchedWorkspaceId: order.matchedWorkspaceId ?? null,
    autoMatchExhausted: order.autoMatchExhausted ?? false,
    matchingExpiresAt: order.matchingExpiresAt?.toISOString() ?? null,
    customerPicks: order.customerPicks ?? null,
    cancelReason: order.cancelReason,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    submittedAt: order.submittedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

async function resolveWizardSchema(order: {
  schemaSnapshot: Prisma.JsonValue;
  serviceCatalogId: string;
}): Promise<{ schema: unknown; staleSnapshot: boolean }> {
  const snap = order.schemaSnapshot;
  if (snap != null && isServiceQuestionnaireV1(snap)) {
    return { schema: snap, staleSnapshot: false };
  }
  const cat = await prisma.serviceCatalog.findUnique({
    where: { id: order.serviceCatalogId },
    select: { dynamicFieldsSchema: true },
  });
  const raw = cat?.dynamicFieldsSchema;
  if (raw != null && isServiceQuestionnaireV1(raw)) {
    return { schema: raw, staleSnapshot: true };
  }
  return { schema: null, staleSnapshot: true };
}

router.use(authenticate);

router.post('/draft', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const body = req.body as Record<string, unknown>;
    const serviceCatalogId = pickStr(body.serviceCatalogId);
    const ep = parseEntryPoint(body.entryPoint);
    if (!serviceCatalogId) {
      return res.status(400).json({ error: 'serviceCatalogId required' });
    }
    if (!ep) {
      return res.status(400).json({ error: 'entryPoint must be explorer | ai_suggestion | direct' });
    }
    const catalog = await prisma.serviceCatalog.findUnique({ where: { id: serviceCatalogId } });
    if (!catalog?.isActive) {
      return res.status(404).json({ error: 'Service type not found or inactive' });
    }

    const prefill = body.prefill && typeof body.prefill === 'object' && !Array.isArray(body.prefill)
      ? (body.prefill as Record<string, unknown>)
      : {};

    const existing = await prisma.order.findFirst({
      where: { customerId: userId, serviceCatalogId, status: OrderStatus.draft },
    });

    const preAnswers = asAnswersRecord(prefill.answers);
    const preAddr = typeof prefill.address === 'string' ? prefill.address : undefined;
    const preDesc = typeof prefill.description === 'string' ? prefill.description : undefined;
    const preFlex =
      typeof prefill.scheduleFlexibility === 'string' ? prefill.scheduleFlexibility : undefined;
    const preScheduled =
      prefill.scheduledAt != null ? new Date(String(prefill.scheduledAt)) : undefined;
    const prePhotos = prefill.photos !== undefined ? normalizePhotosJson(prefill.photos) : undefined;
    const preLat = prefill.locationLat;
    const preLng = prefill.locationLng;
    const preAi =
      typeof prefill.descriptionAiAssisted === 'boolean' ? prefill.descriptionAiAssisted : undefined;

    if (existing) {
      const updated = await prisma.order.update({
        where: { id: existing.id },
        data: {
          entryPoint: ep,
          ...(Object.keys(preAnswers).length
            ? {
                answers: answersToJson({
                  ...asAnswersRecord(existing.answers),
                  ...preAnswers,
                }),
              }
            : {}),
          ...(preAddr !== undefined ? { address: preAddr } : {}),
          ...(preDesc !== undefined ? { description: preDesc } : {}),
          ...(preFlex !== undefined && SCHEDULE_FLEX.has(preFlex) ? { scheduleFlexibility: preFlex } : {}),
          ...(preScheduled && !Number.isNaN(preScheduled.getTime()) ? { scheduledAt: preScheduled } : {}),
          ...(prePhotos !== undefined ? { photos: prePhotos } : {}),
          ...(typeof preLat === 'number' && Number.isFinite(preLat) ? { locationLat: preLat } : {}),
          ...(typeof preLng === 'number' && Number.isFinite(preLng) ? { locationLng: preLng } : {}),
          ...(preAi !== undefined ? { descriptionAiAssisted: preAi } : {}),
        },
      });
      return res.status(201).json(await orderToCustomerJson(updated));
    }

    const created = await prisma.order.create({
      data: {
        customerId: userId,
        serviceCatalogId,
        entryPoint: ep,
        schemaSnapshot: {},
        answers: answersToJson(Object.keys(preAnswers).length ? preAnswers : {}),
        photos: prePhotos ?? [],
        description: preDesc ?? '',
        descriptionAiAssisted: preAi ?? false,
        scheduledAt:
          preScheduled && !Number.isNaN(preScheduled.getTime()) ? preScheduled : null,
        scheduleFlexibility:
          preFlex && SCHEDULE_FLEX.has(preFlex) ? preFlex : 'asap',
        address: preAddr ?? '',
        locationLat: typeof preLat === 'number' && Number.isFinite(preLat) ? preLat : null,
        locationLng: typeof preLng === 'number' && Number.isFinite(preLng) ? preLng : null,
        status: OrderStatus.draft,
      },
    });
    return res.status(201).json(await orderToCustomerJson(created));
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

router.put('/draft/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;
    const order = await prisma.order.findFirst({ where: { id, customerId: userId } });
    if (!order) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    if (order.status !== OrderStatus.draft) {
      return res.status(400).json({ error: 'Only draft orders can be updated here' });
    }

    const data: Prisma.OrderUpdateInput = {};
    if ('answers' in body && body.answers !== undefined) {
      data.answers = answersToJson({
        ...asAnswersRecord(order.answers),
        ...asAnswersRecord(body.answers),
      });
    }
    if ('photos' in body) data.photos = normalizePhotosJson(body.photos);
    if (typeof body.description === 'string') data.description = body.description;
    if (typeof body.descriptionAiAssisted === 'boolean') {
      data.descriptionAiAssisted = body.descriptionAiAssisted;
    }
    if (body.scheduledAt !== undefined) {
      const d = body.scheduledAt != null ? new Date(String(body.scheduledAt)) : null;
      data.scheduledAt = d && !Number.isNaN(d.getTime()) ? d : null;
    }
    if (typeof body.scheduleFlexibility === 'string' && SCHEDULE_FLEX.has(body.scheduleFlexibility)) {
      data.scheduleFlexibility = body.scheduleFlexibility;
    }
    if (typeof body.address === 'string') data.address = body.address;
    if (body.locationLat !== undefined) {
      data.locationLat =
        typeof body.locationLat === 'number' && Number.isFinite(body.locationLat)
          ? body.locationLat
          : null;
    }
    if (body.locationLng !== undefined) {
      data.locationLng =
        typeof body.locationLng === 'number' && Number.isFinite(body.locationLng)
          ? body.locationLng
          : null;
    }

    const updated = await prisma.order.update({ where: { id }, data });
    return res.json(await orderToCustomerJson(updated));
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

router.post('/draft/:id/submit', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;

    const order = await prisma.order.findFirst({ where: { id, customerId: userId } });
    if (!order) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    if (order.status !== OrderStatus.draft) {
      if (order.status === OrderStatus.submitted) {
        return res.status(409).json({
          error: 'Already submitted',
          order: await orderToCustomerJson(order),
        });
      }
      return res.status(400).json({ error: 'Order is not a draft' });
    }

    let answers = asAnswersRecord(order.answers);
    let photosRaw: unknown = order.photos;
    let description = order.description;
    let descriptionAiAssisted = order.descriptionAiAssisted;
    let scheduledAt = order.scheduledAt;
    let scheduleFlexibility = order.scheduleFlexibility;
    let address = order.address;
    let locationLat = order.locationLat;
    let locationLng = order.locationLng;

    if ('answers' in body && body.answers !== undefined) {
      answers = { ...answers, ...asAnswersRecord(body.answers) };
    }
    if ('photos' in body) photosRaw = body.photos;
    if (typeof body.description === 'string') description = body.description;
    if (typeof body.descriptionAiAssisted === 'boolean') {
      descriptionAiAssisted = body.descriptionAiAssisted;
    }
    if (body.scheduledAt !== undefined) {
      const d = body.scheduledAt != null ? new Date(String(body.scheduledAt)) : null;
      scheduledAt = d && !Number.isNaN(d.getTime()) ? d : null;
    }
    if (typeof body.scheduleFlexibility === 'string' && SCHEDULE_FLEX.has(body.scheduleFlexibility)) {
      scheduleFlexibility = body.scheduleFlexibility;
    }
    if (typeof body.address === 'string') address = body.address;
    if (body.locationLat !== undefined) {
      locationLat =
        typeof body.locationLat === 'number' && Number.isFinite(body.locationLat)
          ? body.locationLat
          : null;
    }
    if (body.locationLng !== undefined) {
      locationLng =
        typeof body.locationLng === 'number' && Number.isFinite(body.locationLng)
          ? body.locationLng
          : null;
    }

    const photosJson = normalizePhotosJson(photosRaw);

    let schema;
    try {
      schema = await snapshotSchemaForOrder(order.serviceCatalogId);
    } catch {
      return res.status(400).json({
        error:
          'This service type is unavailable or inactive. Please pick another service from the catalog or try again later.',
      });
    }

    const filesResult = photosJsonToUploadRows(photosJson, schema);
    if (filesResult.ok === false) {
      return res.status(400).json({ error: filesResult.error });
    }

    const validation = validateServiceAnswers(schema, answers, filesResult.rows);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', errors: validation.errors });
    }

    if (description.trim().length < 10) {
      return res.status(400).json({ error: 'description must be at least 10 characters' });
    }
    if (description.length > 1000) {
      return res.status(400).json({ error: 'description must be at most 1000 characters' });
    }
    if (!address.trim()) {
      return res.status(400).json({ error: 'address is required' });
    }
    if (!SCHEDULE_FLEX.has(scheduleFlexibility)) {
      return res.status(400).json({ error: 'Invalid scheduleFlexibility' });
    }
    if (scheduleFlexibility === 'specific') {
      if (!scheduledAt) {
        return res.status(400).json({ error: 'scheduledAt is required when scheduleFlexibility is specific' });
      }
      if (scheduledAt.getTime() <= Date.now()) {
        return res.status(400).json({ error: 'scheduledAt must be in the future' });
      }
    }

    const snapshot = schema as unknown as Prisma.InputJsonValue;

    const submitted = await prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id },
        data: {
          answers: answersToJson(answers),
          photos: photosJson,
          description,
          descriptionAiAssisted,
          scheduledAt,
          scheduleFlexibility,
          address,
          locationLat,
          locationLng,
          schemaSnapshot: snapshot,
          status: OrderStatus.submitted,
          phase: phaseFromStatus(OrderStatus.submitted),
          submittedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'ORDER_SUBMITTED',
          resourceType: 'order',
          resourceId: id,
        },
      });
      return o;
    });

    await publish('orders.submitted', {
      orderId: submitted.id,
      customerId: submitted.customerId,
      serviceCatalogId: submitted.serviceCatalogId,
    });

    type SubmitMatchOutcome =
      | {
          mode: 'auto_matched';
          attemptId?: string;
          windowExpiresAt?: string | null;
          reason?: string;
        }
      | {
          mode: 'round_robin_invited';
          invitedCount: number;
          attemptIds: string[];
          windowExpiresAt?: string | null;
          reason?: string;
        }
      | {
          mode: 'no_eligible_providers';
          reason?: string;
          windowExpiresAt?: string | null;
        };

    let matchOutcome: SubmitMatchOutcome = { mode: 'no_eligible_providers', reason: 'not_evaluated' };

    try {
      const pre = await findEligiblePackagesForOffer(submitted.id);
      if (pre.length > 0) {
        const mo = await autoMatchOffer(submitted.id, { depth: 0 });
        if (mo.matched) {
          const snap = await prisma.order.findUnique({
            where: { id: submitted.id },
            select: { matchingExpiresAt: true },
          });
          matchOutcome = {
            mode: 'auto_matched',
            ...(mo.attemptId != null ? { attemptId: mo.attemptId } : {}),
            ...(mo.reason != null ? { reason: mo.reason } : {}),
            windowExpiresAt: snap?.matchingExpiresAt?.toISOString() ?? null,
          };
        } else {
          const rr = await roundRobinInviteOffer(submitted.id);
          const snap = await prisma.order.findUnique({
            where: { id: submitted.id },
            select: { matchingExpiresAt: true },
          });
          if (rr.invitedCount > 0) {
            matchOutcome = {
              mode: 'round_robin_invited',
              invitedCount: rr.invitedCount,
              attemptIds: rr.attemptIds,
              windowExpiresAt: snap?.matchingExpiresAt?.toISOString() ?? null,
            };
          } else {
            matchOutcome = {
              mode: 'no_eligible_providers',
              reason: 'no_negotiation_eligible_packages',
              windowExpiresAt: null,
            };
          }
        }
      } else {
        const rr = await roundRobinInviteOffer(submitted.id);
        const snap = await prisma.order.findUnique({
          where: { id: submitted.id },
          select: { matchingExpiresAt: true },
        });
        if (rr.invitedCount > 0) {
          matchOutcome = {
            mode: 'round_robin_invited',
            invitedCount: rr.invitedCount,
            attemptIds: rr.attemptIds,
            windowExpiresAt: snap?.matchingExpiresAt?.toISOString() ?? null,
          };
        } else {
          matchOutcome = {
            mode: 'no_eligible_providers',
            reason: 'no_negotiation_eligible_packages',
            windowExpiresAt: null,
          };
        }
      }
    } catch (matchErr: unknown) {
      if (matchErr instanceof RoundRobinValidationError) {
        const o = await prisma.order.findUnique({ where: { id: submitted.id } });
        return res.status(400).json({
          error: matchErr.message,
          ...(o ? { order: await orderToCustomerJson(o) } : {}),
        });
      }
      console.error(matchErr);
      matchOutcome = { mode: 'no_eligible_providers', reason: 'match_error' };
    }

    const finalOrder = await prisma.order.findUnique({
      where: { id: submitted.id },
      include: {
        matchedProvider: {
          select: { id: true, displayName: true, firstName: true, lastName: true, avatarUrl: true },
        },
        matchedWorkspace: { select: { id: true, name: true } },
        matchedPackage: {
          select: { id: true, name: true, finalPrice: true, currency: true, durationMinutes: true },
        },
      },
    });
    if (!finalOrder) {
      return res.status(500).json({ error: 'Order not found after submit' });
    }
    return res.json({
      ...(await orderToCustomerJson(finalOrder)),
      matchOutcome,
      matchedSummary:
        finalOrder.matchedProvider && finalOrder.matchedWorkspace && finalOrder.matchedPackage
          ? {
              provider: finalOrder.matchedProvider,
              workspace: finalOrder.matchedWorkspace,
              package: finalOrder.matchedPackage,
            }
          : null,
    });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const statusFilter = parseStatusArray(req.query);
    const phases = parsePhaseArray(req.query);
    const effectivePhases = phases.length ? phases : DEFAULT_PHASES;
    const includeDrafts = parseIncludeDraftsCustomer(req.query);
    const page = parseIntDefault(pickQueryStr(req.query, 'page'), 1, 1, 1_000_000);
    const pageSize = parseIntDefault(pickQueryStr(req.query, 'pageSize'), 20, 1, 100);
    const andList: Prisma.OrderWhereInput[] = [{ customerId: userId }, phaseListWhere(effectivePhases, includeDrafts)];
    if (statusFilter.length) {
      andList.push({ status: { in: statusFilter } });
    }
    const where: Prisma.OrderWhereInput = andList.length > 1 ? { AND: andList } : andList[0]!;
    /** Phase facets for the whole customer pipeline (ignore list status/phase filters). */
    const whereFacetBase: Prisma.OrderWhereInput = { customerId: userId };
    const skip = (page - 1) * pageSize;
    const [total, rows, facetsPhase] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          serviceCatalog: { select: { id: true, name: true, categoryId: true } },
          matchedProvider: {
            select: { id: true, displayName: true, firstName: true, lastName: true, avatarUrl: true },
          },
          matchedWorkspace: { select: { id: true, name: true } },
          matchedPackage: {
            select: { id: true, name: true, finalPrice: true, currency: true, durationMinutes: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      countOrderPhaseFacets(whereFacetBase),
    ]);

    const uniqueCategoryIds = [
      ...new Set(rows.map((r) => r.serviceCatalog.categoryId).filter(Boolean)),
    ] as string[];
    const crumbCache = new Map<string, Awaited<ReturnType<typeof categoryBreadcrumbs>>>();
    await Promise.all(
      uniqueCategoryIds.map(async (cid) => {
        crumbCache.set(cid, await categoryBreadcrumbs(cid, 5));
      }),
    );

    const items = await Promise.all(
      rows.map(async (r) => {
        const base = await orderToCustomerJson(r);
        const cid = r.serviceCatalog.categoryId;
        const breadcrumb = cid ? crumbCache.get(cid) ?? [] : [];
        return {
          ...base,
          serviceCatalog: {
            id: r.serviceCatalog.id,
            name: r.serviceCatalog.name,
            breadcrumb,
          },
          matchedSummary:
            r.matchedProvider && r.matchedWorkspace && r.matchedPackage
              ? {
                  provider: r.matchedProvider,
                  workspace: r.matchedWorkspace,
                  package: r.matchedPackage,
                }
              : null,
        };
      }),
    );

    res.json({
      items,
      total,
      page,
      pageSize,
      facets: { phase: facetsPhase },
    });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

/** Provider / workspace pipeline: matched party, workspace-linked orders, or active inbox attempts. */
router.get('/provider/me', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const statusFilter = parseStatusArray(req.query);
    const phases = parsePhaseArray(req.query);
    const effectivePhases = phases.length ? phases : DEFAULT_PHASES;
    const page = parseIntDefault(pickQueryStr(req.query, 'page'), 1, 1, 1_000_000);
    const pageSize = parseIntDefault(pickQueryStr(req.query, 'pageSize'), 20, 1, 100);

    const workspaces = await listMyWorkspaces(userId);
    const workspaceIds = workspaces.map((w) => w.id);

    const attemptScope: Prisma.OrderWhereInput =
      workspaceIds.length > 0
        ? {
            matchAttempts: {
              some: {
                workspaceId: { in: workspaceIds },
                status: {
                  in: [MatchAttemptStatus.invited, MatchAttemptStatus.accepted, MatchAttemptStatus.matched],
                },
              },
            },
          }
        : { id: '__no_match__' };

    const providerParty: Prisma.OrderWhereInput = {
      OR: [
        { matchedProviderId: userId },
        ...(workspaceIds.length ? [{ matchedWorkspaceId: { in: workspaceIds } } as const] : []),
        attemptScope,
      ],
    };

    const andList: Prisma.OrderWhereInput[] = [providerParty, phaseListWhere(effectivePhases, false)];
    if (statusFilter.length) {
      andList.push({ status: { in: statusFilter } });
    }
    const where: Prisma.OrderWhereInput = andList.length > 1 ? { AND: andList } : andList[0]!;
    const whereFacetBase: Prisma.OrderWhereInput = providerParty;

    const skip = (page - 1) * pageSize;
    const [total, rows, facetsPhase] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          serviceCatalog: { select: { id: true, name: true, categoryId: true } },
          matchedProvider: {
            select: { id: true, displayName: true, firstName: true, lastName: true, avatarUrl: true },
          },
          matchedWorkspace: { select: { id: true, name: true } },
          matchedPackage: {
            select: { id: true, name: true, finalPrice: true, currency: true, durationMinutes: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      countOrderPhaseFacets(whereFacetBase),
    ]);

    const uniqueCategoryIds = [...new Set(rows.map((r) => r.serviceCatalog.categoryId).filter(Boolean))] as string[];
    const crumbCache = new Map<string, Awaited<ReturnType<typeof categoryBreadcrumbs>>>();
    await Promise.all(
      uniqueCategoryIds.map(async (cid) => {
        crumbCache.set(cid, await categoryBreadcrumbs(cid, 5));
      }),
    );

    const items = await Promise.all(
      rows.map(async (r) => {
        const base = await orderToCustomerJson(r);
        const cid = r.serviceCatalog.categoryId;
        const breadcrumb = cid ? crumbCache.get(cid) ?? [] : [];
        return {
          ...base,
          serviceCatalog: {
            id: r.serviceCatalog.id,
            name: r.serviceCatalog.name,
            breadcrumb,
          },
          matchedSummary:
            r.matchedProvider && r.matchedWorkspace && r.matchedPackage
              ? {
                  provider: r.matchedProvider,
                  workspace: r.matchedWorkspace,
                  package: r.matchedPackage,
                }
              : null,
        };
      }),
    );

    res.json({
      items,
      total,
      page,
      pageSize,
      facets: { phase: facetsPhase },
    });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        matchedProvider: {
          select: { id: true, displayName: true, firstName: true, lastName: true, avatarUrl: true },
        },
        matchedWorkspace: { select: { id: true, name: true } },
        matchedPackage: {
          select: { id: true, name: true, finalPrice: true, currency: true, durationMinutes: true },
        },
      },
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.customerId !== userId && !canViewOrderAsStaff(role)) {
      const matchedParty = await canViewOrderAsMatchedParty(userId, order);
      if (!matchedParty) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    const resolved = await resolveWizardSchema(order);
    const payment = await getOrderPaymentSummary(order.id);
    const base = await orderToCustomerJson(order);
    res.json({
      ...base,
      schema: resolved.schema,
      staleSnapshot: resolved.staleSnapshot,
      payment,
      matchedSummary:
        order.matchedProvider && order.matchedWorkspace && order.matchedPackage
          ? {
              provider: order.matchedProvider,
              workspace: order.matchedWorkspace,
              package: order.matchedPackage,
            }
          : null,
    });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

router.get('/:id/candidates', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.customerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await expireStaleAttempts(id);

    const fresh = await prisma.order.findUnique({ where: { id } });
    if (!fresh) return res.status(404).json({ error: 'Order not found' });
    const nowMs = Date.now();
    const windowMs = fresh.matchingExpiresAt?.getTime() ?? null;
    const secondsRemaining = windowMs == null ? null : Math.max(0, Math.floor((windowMs - nowMs) / 1000));

    if (fresh.status === OrderStatus.draft || fresh.status !== OrderStatus.matching) {
      return res.json({
        windowExpiresAt: fresh.matchingExpiresAt?.toISOString() ?? null,
        secondsRemaining,
        candidates: [],
      });
    }

    const rows = await prisma.offerMatchAttempt.findMany({
      where: { offerId: id, status: MatchAttemptStatus.accepted },
      orderBy: [{ score: 'asc' }, { respondedAt: 'asc' }],
      include: {
        provider: { select: { id: true, displayName: true, firstName: true, lastName: true, avatarUrl: true } },
        workspace: { select: { id: true, name: true, logoUrl: true } },
        package: {
          select: {
            id: true,
            name: true,
            finalPrice: true,
            currency: true,
            durationMinutes: true,
            serviceCatalog: { select: { id: true, name: true } },
          },
        },
      },
    });
    const providerIds = [...new Set(rows.map((r) => r.providerId))];
    const ratingGroups =
      providerIds.length > 0
        ? await prisma.service.groupBy({
            by: ['providerId'],
            where: { providerId: { in: providerIds } },
            _avg: { rating: true },
          })
        : [];
    const ratingByProvider = new Map(ratingGroups.map((g) => [g.providerId, g._avg.rating ?? 0]));

    function providerDisplayName(p: {
      displayName: string | null;
      firstName: string | null;
      lastName: string | null;
    }): string {
      if (p.displayName?.trim()) return p.displayName.trim();
      const n = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
      return n || 'Provider';
    }

    return res.json({
      windowExpiresAt: fresh.matchingExpiresAt?.toISOString() ?? null,
      secondsRemaining,
      candidates: rows.map((a) => ({
        attemptId: a.id,
        providerId: a.providerId,
        providerName: providerDisplayName(a.provider),
        providerAvatarUrl: a.provider.avatarUrl ?? null,
        providerRating: ratingByProvider.get(a.providerId) ?? null,
        workspaceId: a.workspaceId,
        workspaceName: a.workspace.name,
        workspaceLogoUrl: a.workspace.logoUrl ?? null,
        packageId: a.packageId,
        packageName: a.package.name,
        packageFinalPrice: a.package.finalPrice,
        packageCurrency: a.package.currency,
        packageDuration: a.package.durationMinutes,
        distanceKm: a.distanceKm,
        score: a.score,
        respondedAt: a.respondedAt?.toISOString() ?? null,
      })),
    });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

router.post('/:id/select-provider', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;
    const attemptId = typeof body.attemptId === 'string' ? body.attemptId : '';
    const savePriorityTemplate = body.savePriorityTemplate === true;
    const priorityTemplate =
      body.priorityTemplate && typeof body.priorityTemplate === 'object'
        ? (body.priorityTemplate as Record<string, unknown>)
        : null;
    if (!attemptId) return res.status(400).json({ error: 'attemptId is required' });

    await expireStaleAttempts(id);
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.customerId !== userId) return res.status(403).json({ error: 'Forbidden' });
    if (order.status !== OrderStatus.matching) {
      return res.status(400).json({ error: 'Order is not in matching status' });
    }
    const chosen = await prisma.offerMatchAttempt.findUnique({ where: { id: attemptId } });
    if (!chosen || chosen.offerId !== id || chosen.status !== MatchAttemptStatus.accepted) {
      return res.status(400).json({ error: 'Chosen attempt must be an accepted candidate for this order' });
    }

    const now = new Date();
    const supersededAttemptIds = await prisma.$transaction(async (tx) => {
      const toSupersede = await tx.offerMatchAttempt.findMany({
        where: {
          offerId: id,
          id: { not: chosen.id },
          status: { in: [MatchAttemptStatus.accepted, MatchAttemptStatus.invited] },
        },
        select: { id: true },
      });
      const ids = toSupersede.map((r) => r.id);
      await tx.offerMatchAttempt.update({
        where: { id: chosen.id },
        data: { status: MatchAttemptStatus.matched, matchedAt: now },
      });
      await tx.offerMatchAttempt.updateMany({
        where: {
          offerId: id,
          id: { not: chosen.id },
          status: { in: [MatchAttemptStatus.accepted, MatchAttemptStatus.invited] },
        },
        data: { status: MatchAttemptStatus.superseded, supersededAt: now },
      });
      await tx.order.update({
        where: { id },
        data: {
          matchedPackageId: chosen.packageId,
          matchedProviderId: chosen.providerId,
          matchedWorkspaceId: chosen.workspaceId,
          status: OrderStatus.contracted,
          phase: phaseFromStatus(OrderStatus.contracted),
          matchingExpiresAt: null,
        },
      });
      if (savePriorityTemplate && priorityTemplate) {
        await tx.user.update({
          where: { id: userId },
          data: {
            orderPriorities: {
              ...(priorityTemplate as Prisma.InputJsonValue as object),
              savedAt: now.toISOString(),
            } as Prisma.InputJsonValue,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'ORDER_CUSTOMER_SELECTED_PROVIDER',
          resourceType: 'order',
          resourceId: id,
          metadata: {
            attemptId: chosen.id,
            packageId: chosen.packageId,
            providerId: chosen.providerId,
            workspaceId: chosen.workspaceId,
            supersededAttemptIds: ids,
          } as Prisma.InputJsonValue,
        },
      });
      return ids;
    });
    await publish('orders.customer_selected_provider', {
      orderId: id,
      attemptId: chosen.id,
      supersededAttemptIds,
    });
    const updatedOrder = await prisma.order.findUnique({ where: { id } });
    if (!updatedOrder) {
      return res.status(500).json({ error: 'Order not found after selection' });
    }
    res.json({
      order: await orderToCustomerJson(updatedOrder),
      supersededCount: supersededAttemptIds.length,
    });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

router.post('/:id/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const reason = pickStr((req.body as Record<string, unknown>)?.reason);
    if (!reason || reason.length < 5) {
      return res.status(400).json({ error: 'reason must be at least 5 characters' });
    }
    const order = await prisma.order.findFirst({ where: { id, customerId: userId } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status !== OrderStatus.draft && order.status !== OrderStatus.submitted) {
      return res.status(400).json({ error: 'Order cannot be cancelled in its current state' });
    }
    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.cancelled,
          phase: phaseFromStatus(OrderStatus.cancelled, order.phase),
          cancelReason: reason,
          cancelledAt: now,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'ORDER_CANCELLED',
          resourceType: 'order',
          resourceId: id,
          metadata: { reason, previousStatus: order.status } as Prisma.InputJsonValue,
        },
      });
      return o;
    });
    res.json(await orderToCustomerJson(updated));
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

export default router;
