import { Router, Response } from 'express';
import { ChatModerationStatus, Prisma } from '@prisma/client';
import prisma from '../lib/db.js';
import { authenticate, isAdmin, AuthRequest } from '../lib/auth.middleware.js';

const router = Router();

function parseDate(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseMetadataRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

function mergeMessageMetadata(
  existing: Prisma.JsonValue | null | undefined,
  patch: Record<string, unknown>,
): Prisma.InputJsonValue {
  const base = parseMetadataRecord(existing);
  return { ...base, ...patch } as Prisma.InputJsonValue;
}

function pickStr(body: unknown, key: string): string | undefined {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined;
  const v = (body as Record<string, unknown>)[key];
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

router.use(authenticate, isAdmin);

router.get('/flags', async (req: AuthRequest, res: Response) => {
  try {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : undefined;
    const customerId = typeof req.query.customerId === 'string' ? req.query.customerId : undefined;
    const senderId = typeof req.query.senderId === 'string' ? req.query.senderId : undefined;
    const participantId =
      typeof req.query.participantId === 'string' ? req.query.participantId : undefined;
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined;
    const statusRaw = typeof req.query.status === 'string' ? req.query.status : undefined;
    const statuses: ChatModerationStatus[] = statusRaw
      ? statusRaw
          .split(',')
          .map((s) => s.trim())
          .filter((s): s is ChatModerationStatus =>
            ['masked', 'flagged', 'blocked', 'clean'].includes(s),
          )
      : [ChatModerationStatus.masked, ChatModerationStatus.flagged, ChatModerationStatus.blocked];
    const limit = Math.max(
      1,
      Math.min(500, typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) || 50 : 50),
    );

    const threadWhere: Prisma.OrderChatThreadWhereInput = {};
    if (providerId) threadWhere.providerId = providerId;
    if (customerId) threadWhere.customerId = customerId;
    if (workspaceId) threadWhere.order = { matchedWorkspaceId: workspaceId };
    if (participantId) {
      threadWhere.OR = [
        { customerId: participantId },
        { providerId: participantId },
        { messages: { some: { senderId: participantId } } },
      ];
    }

    const where: Prisma.OrderChatMessageWhereInput = {
      moderationStatus: { in: statuses },
      ...(senderId ? { senderId } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(Object.keys(threadWhere).length ? { thread: threadWhere } : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.orderChatMessage.count({ where }),
      prisma.orderChatMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          thread: {
            select: {
              id: true,
              orderId: true,
              customerId: true,
              providerId: true,
              order: {
                select: {
                  matchedWorkspaceId: true,
                  matchedWorkspace: { select: { id: true, name: true } },
                  matchedPackageId: true,
                  serviceCatalogId: true,
                  status: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return res.json({ items: rows, total, truncated: total > rows.length });
  } catch (err: unknown) {
    console.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

router.post('/flags/:id/review', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const note = pickStr(req.body, 'internalNote');
    const row = await prisma.orderChatMessage.findUnique({
      where: { id },
      include: { thread: { select: { orderId: true } } },
    });
    if (!row) {
      return res.status(404).json({ error: 'Message not found' });
    }
    const meta = parseMetadataRecord(row.metadata);
    const prevReview =
      meta.moderationReview && typeof meta.moderationReview === 'object' && !Array.isArray(meta.moderationReview)
        ? (meta.moderationReview as Record<string, unknown>)
        : {};
    const now = new Date().toISOString();
    const nextMeta = mergeMessageMetadata(row.metadata, {
      moderationReview: {
        ...prevReview,
        reviewedAt: now,
        reviewedById: req.user!.userId,
        ...(note ? { internalNote: note } : {}),
      },
    });
    const updated = await prisma.orderChatMessage.update({
      where: { id },
      data: { metadata: nextMeta },
      include: {
        thread: {
          select: {
            id: true,
            orderId: true,
            customerId: true,
            providerId: true,
            order: {
              select: {
                matchedWorkspaceId: true,
                matchedWorkspace: { select: { id: true, name: true } },
                matchedPackageId: true,
                serviceCatalogId: true,
                status: true,
              },
            },
          },
        },
      },
    });
    try {
      await prisma.auditLog.create({
        data: {
          actorId: req.user!.userId,
          action: 'CHAT_MODERATION_REVIEWED',
          resourceType: 'order_chat_message',
          resourceId: id,
          metadata: { orderId: row.thread.orderId } as Prisma.InputJsonValue,
        },
      });
    } catch {
      /* non-fatal */
    }
    return res.json(updated);
  } catch (err: unknown) {
    console.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

router.post('/flags/:id/note', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const note = pickStr(req.body, 'internalNote');
    if (!note) {
      return res.status(400).json({ error: 'internalNote is required' });
    }
    const row = await prisma.orderChatMessage.findUnique({ where: { id } });
    if (!row) {
      return res.status(404).json({ error: 'Message not found' });
    }
    const meta = parseMetadataRecord(row.metadata);
    const prevReview =
      meta.moderationReview && typeof meta.moderationReview === 'object' && !Array.isArray(meta.moderationReview)
        ? (meta.moderationReview as Record<string, unknown>)
        : {};
    const nextMeta = mergeMessageMetadata(row.metadata, {
      moderationReview: {
        ...prevReview,
        internalNote: note,
        noteUpdatedAt: new Date().toISOString(),
        noteUpdatedById: req.user!.userId,
      },
    });
    const updated = await prisma.orderChatMessage.update({
      where: { id },
      data: { metadata: nextMeta },
      include: {
        thread: {
          select: {
            id: true,
            orderId: true,
            customerId: true,
            providerId: true,
            order: {
              select: {
                matchedWorkspaceId: true,
                matchedWorkspace: { select: { id: true, name: true } },
                matchedPackageId: true,
                serviceCatalogId: true,
                status: true,
              },
            },
          },
        },
      },
    });
    return res.json(updated);
  } catch (err: unknown) {
    console.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

router.post('/flags/:id/escalate', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const note = pickStr(req.body, 'internalNote');
    const row = await prisma.orderChatMessage.findUnique({
      where: { id },
      include: { thread: { select: { orderId: true } } },
    });
    if (!row) {
      return res.status(404).json({ error: 'Message not found' });
    }
    const meta = parseMetadataRecord(row.metadata);
    const prevReview =
      meta.moderationReview && typeof meta.moderationReview === 'object' && !Array.isArray(meta.moderationReview)
        ? (meta.moderationReview as Record<string, unknown>)
        : {};
    const now = new Date().toISOString();
    const nextMeta = mergeMessageMetadata(row.metadata, {
      moderationReview: {
        ...prevReview,
        escalatedToSupport: true,
        escalatedAt: now,
        escalatedById: req.user!.userId,
        ...(note ? { internalNote: note } : {}),
      },
    });
    const updated = await prisma.orderChatMessage.update({
      where: { id },
      data: { metadata: nextMeta },
      include: {
        thread: {
          select: {
            id: true,
            orderId: true,
            customerId: true,
            providerId: true,
            order: {
              select: {
                matchedWorkspaceId: true,
                matchedWorkspace: { select: { id: true, name: true } },
                matchedPackageId: true,
                serviceCatalogId: true,
                status: true,
              },
            },
          },
        },
      },
    });
    try {
      await prisma.auditLog.create({
        data: {
          actorId: req.user!.userId,
          action: 'CHAT_MODERATION_ESCALATED',
          resourceType: 'order_chat_message',
          resourceId: id,
          metadata: { orderId: row.thread.orderId, note: note ?? null } as Prisma.InputJsonValue,
        },
      });
    } catch {
      /* non-fatal */
    }
    return res.json(updated);
  } catch (err: unknown) {
    console.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

export default router;
