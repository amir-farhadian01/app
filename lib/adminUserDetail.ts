import prisma from './db.js';
import { mapUserToRow, userListInclude } from './adminUsersList.js';

export async function fetchAdminUserFull(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: userListInclude,
  });
  if (!user) return null;

  const [auditLogs, transactions, contracts, requests] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        OR: [{ resourceId: userId }, { actorId: userId }],
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
      include: { actor: { select: { id: true, email: true, displayName: true } } },
    }),
    (async () => {
      const companyIds = new Set<string>();
      if (user.companyId) companyIds.add(user.companyId);
      const rows = await prisma.companyUser.findMany({ where: { userId }, select: { companyId: true } });
      for (const r of rows) companyIds.add(r.companyId);
      const owned = await prisma.company.findUnique({ where: { ownerId: userId }, select: { id: true } });
      if (owned) companyIds.add(owned.id);
      return prisma.transaction.findMany({
        where: {
          OR: [{ customerId: userId }, { companyId: { in: [...companyIds] } }],
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: {
          customer: { select: { id: true, displayName: true, email: true } },
          company: { select: { id: true, name: true } },
        },
      });
    })(),
    prisma.contract.findMany({
      where: { OR: [{ customerId: userId }, { providerId: userId }] },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.request.findMany({
      where: { OR: [{ customerId: userId }, { providerId: userId }] },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        service: { select: { id: true, title: true, price: true } },
        customer: { select: { id: true, displayName: true, email: true } },
        provider: { select: { id: true, displayName: true, email: true } },
      },
    }),
  ]);

  return {
    user: mapUserToRow(user),
    kycRecord: user.kyc
      ? {
          id: user.kyc.id,
          type: user.kyc.type,
          status: user.kyc.status,
          createdAt: user.kyc.createdAt.toISOString(),
        }
      : null,
    auditLogs,
    transactions,
    contracts,
    requests,
  };
}
