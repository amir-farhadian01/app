import { connect, NatsConnection } from 'nats';

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
