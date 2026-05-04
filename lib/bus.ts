import { connect, NatsConnection } from 'nats';

/**
 * Published subjects: Sprint L contracts `contracts.sent`, `contracts.approved`,
 * `contracts.rejected`; Sprint I matching `orders.submitted`, `orders.auto_matched`,
 * `orders.auto_match_exhausted`, `orders.provider_acknowledged`, `orders.provider_declined`.
 * Consumers deferred; use {@link publish}.
 */
let natsConn: NatsConnection | null = null;

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

export default getNats;
