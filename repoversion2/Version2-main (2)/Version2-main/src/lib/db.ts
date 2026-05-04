import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prismaOptions = {
  log: ['query'] as any[],
};

if (!process.env.DATABASE_URL) {
  console.warn('⚠️ [Mock Mode] DATABASE_URL configuration missing. Database persistence layer will operate in offline/mock mode.');
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
