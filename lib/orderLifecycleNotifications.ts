import prisma from './db.js';

function displayNameForUser(u: {
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
} | null): string | null {
  if (!u) return null;
  const d = u.displayName?.trim();
  if (d) return d;
  const parts = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return parts || null;
}

/**
 * NATS `orders.matched` — customer sees who was matched (auto or admin override).
 */
export async function notifyCustomerOrderMatchedFromEvent(data: unknown): Promise<void> {
  const orderId = typeof data === 'object' && data !== null && 'orderId' in data ? String((data as { orderId: unknown }).orderId) : '';
  if (!orderId) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      serviceCatalog: { select: { name: true } },
      matchedWorkspace: { select: { name: true } },
      matchedProvider: {
        select: { displayName: true, firstName: true, lastName: true },
      },
    },
  });
  if (!order) return;

  const workspaceName = order.matchedWorkspace?.name?.trim();
  const providerName = displayNameForUser(order.matchedProvider);
  const who = workspaceName || providerName || 'A provider';
  const service = order.serviceCatalog?.name?.trim() ?? 'your service request';

  await prisma.notification.create({
    data: {
      userId: order.customerId,
      title: 'Provider matched',
      message: `${who} was matched for ${service}. Open your order to chat and continue.`,
      type: 'order_matched',
      link: `/orders/${order.id}`,
    },
  });
}

/**
 * NATS `orders.completed` — provider marked the job complete.
 */
export async function notifyCustomerOrderCompletedFromEvent(data: unknown): Promise<void> {
  const orderId = typeof data === 'object' && data !== null && 'orderId' in data ? String((data as { orderId: unknown }).orderId) : '';
  if (!orderId) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, customerId: true, serviceCatalog: { select: { name: true } } },
  });
  if (!order) return;

  const service = order.serviceCatalog?.name?.trim() ?? 'your order';

  await prisma.notification.create({
    data: {
      userId: order.customerId,
      title: 'Job marked complete',
      message: `The provider marked ${service} complete. You can leave a review when ready.`,
      type: 'order_completed',
      link: `/orders/${order.id}`,
    },
  });
}

/**
 * NATS `contracts.approved` — contract approved (customer flow unlocks payment).
 */
export async function notifyCustomerContractApprovedFromEvent(data: unknown): Promise<void> {
  const orderId = typeof data === 'object' && data !== null && 'orderId' in data ? String((data as { orderId: unknown }).orderId) : '';
  if (!orderId) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, customerId: true, serviceCatalog: { select: { name: true } } },
  });
  if (!order) return;

  const service = order.serviceCatalog?.name?.trim() ?? 'your order';

  await prisma.notification.create({
    data: {
      userId: order.customerId,
      title: 'Contract approved',
      message: `The contract for ${service} is approved. You can proceed to payment from the order when ready.`,
      type: 'contract_approved',
      link: `/orders/${order.id}`,
    },
  });
}
