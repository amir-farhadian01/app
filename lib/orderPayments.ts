import { ContractVersionStatus, OrderStatus, type Transaction } from '@prisma/client';
import prisma from './db.js';

export const PAYMENT_GATE_CODE_CONTRACT_APPROVAL_REQUIRED = 'CONTRACT_APPROVAL_REQUIRED';

export type PaymentGateResult =
  | {
      ok: true;
      orderId: string;
      amount: number;
      currency: string;
      contractVersionId: string;
    }
  | {
      ok: false;
      code: typeof PAYMENT_GATE_CODE_CONTRACT_APPROVAL_REQUIRED;
      message: string;
    };

export type OrderPaymentSummary = {
  status: 'none' | 'session_created' | 'paid';
  lastTransactionId: string | null;
  lastAmount: number | null;
  currency: string | null;
  lastCreatedAt: string | null;
};

function parseOrderPayment(tx: Transaction): { kind: 'session' | 'capture'; currency: string | null } {
  const category = (tx.category ?? '').toLowerCase();
  if (category === 'order_payment_capture') {
    const m = /currency:([A-Z]{3})/.exec(tx.description ?? '');
    return { kind: 'capture', currency: m?.[1] ?? null };
  }
  const m = /currency:([A-Z]{3})/.exec(tx.description ?? '');
  return { kind: 'session', currency: m?.[1] ?? null };
}

export async function evaluateOrderPaymentGate(orderId: string): Promise<PaymentGateResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      matchedPackage: { select: { finalPrice: true, currency: true } },
      orderContract: {
        include: {
          currentVersion: {
            select: { id: true, status: true, amount: true, currency: true },
          },
        },
      },
    },
  });
  if (!order || !order.orderContract?.currentVersion) {
    return {
      ok: false,
      code: PAYMENT_GATE_CODE_CONTRACT_APPROVAL_REQUIRED,
      message: 'Payment is locked until an approved contract version is current for this order.',
    };
  }
  const current = order.orderContract.currentVersion;
  const statusOk = new Set<OrderStatus>([
    OrderStatus.contracted,
    OrderStatus.paid,
    OrderStatus.in_progress,
    OrderStatus.completed,
  ]).has(order.status);
  if (!statusOk || current.status !== ContractVersionStatus.approved) {
    return {
      ok: false,
      code: PAYMENT_GATE_CODE_CONTRACT_APPROVAL_REQUIRED,
      message: 'Payment is locked until order is contracted from an approved contract version.',
    };
  }
  const amount = current.amount ?? order.matchedPackage?.finalPrice ?? 0;
  const currency = current.currency ?? order.matchedPackage?.currency ?? 'CAD';
  return {
    ok: true,
    orderId: order.id,
    amount,
    currency,
    contractVersionId: current.id,
  };
}

export async function getOrderPaymentSummary(orderId: string): Promise<OrderPaymentSummary> {
  const txs = await prisma.transaction.findMany({
    where: {
      category: { in: ['order_payment_session', 'order_payment_capture'] },
      description: { contains: `order:${orderId}` },
    },
    orderBy: { timestamp: 'desc' },
    take: 20,
  });
  if (!txs.length) {
    return {
      status: 'none',
      lastTransactionId: null,
      lastAmount: null,
      currency: null,
      lastCreatedAt: null,
    };
  }
  const latest = txs[0]!;
  const parsed = parseOrderPayment(latest);
  return {
    status: parsed.kind === 'capture' ? 'paid' : 'session_created',
    lastTransactionId: latest.id,
    lastAmount: latest.amount,
    currency: parsed.currency,
    lastCreatedAt: latest.timestamp.toISOString(),
  };
}
