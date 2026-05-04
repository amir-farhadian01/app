import { connect, JSONCodec, NatsConnection } from 'nats';
import {
  notifyCustomerContractApprovedFromEvent,
  notifyCustomerOrderCompletedFromEvent,
  notifyCustomerOrderMatchedFromEvent,
} from './orderLifecycleNotifications.js';

/**
 * Published subjects: Sprint L contracts `contracts.sent`, `contracts.approved`,
 * `contracts.rejected`; Sprint I matching `orders.submitted`, `orders.matched`,
 * `orders.auto_matched`, `orders.auto_match_exhausted`, `orders.provider_acknowledged`,
 * `orders.provider_declined`.
 * In-process consumers: {@link startNatsNotificationConsumers} (customer notifications).
 */
let natsConn: NatsConnection | null = null;
let notificationConsumersStarted = false;
const jsonCodec = JSONCodec();

export async function getNats(): Promise<NatsConnection> {
  if (!natsConn) {
    const natsUrl = process.env.NATS_URL || 'nats://localhost:4222';
    try {
      natsConn = await connect({ servers: natsUrl });
      console.log('NATS connected');
    } catch (err) {
      console.error('NATS connection failed (non-fatal):', err);
      throw err;
    }
  }
  return natsConn;
}

export async function publish(subject: string, data: object): Promise<void> {
  try {
    const nc = await getNats();
    const encoder = new TextEncoder();
    nc.publish(subject, encoder.encode(JSON.stringify(data)));
  } catch {
    // NATS is optional — don't crash if unavailable
  }
}

/**
 * Subscribe to order/contract lifecycle subjects and create customer `Notification` rows.
 * Safe to call once after {@link getNats}; no-op if NATS did not connect.
 */
export async function startNatsNotificationConsumers(): Promise<void> {
  if (notificationConsumersStarted) return;
  notificationConsumersStarted = true;

  let nc: NatsConnection;
  try {
    nc = await getNats();
  } catch {
    notificationConsumersStarted = false;
    return;
  }

  const subscribeHandler = (subject: string, handler: (payload: unknown) => Promise<void>) => {
    nc.subscribe(subject, {
      callback: (err, msg) => {
        if (err) {
          console.error(`NATS ${subject}:`, err);
          return;
        }
        void (async () => {
          try {
            const payload = jsonCodec.decode(msg.data);
            await handler(payload);
          } catch (e) {
            console.error(`NATS ${subject} handler failed:`, e);
          }
        })();
      },
    });
  };

  subscribeHandler('orders.matched', notifyCustomerOrderMatchedFromEvent);
  subscribeHandler('orders.completed', notifyCustomerOrderCompletedFromEvent);
  subscribeHandler('contracts.approved', notifyCustomerContractApprovedFromEvent);

  console.log('NATS notification consumers registered (orders.matched, orders.completed, contracts.approved)');
}

export default getNats;
