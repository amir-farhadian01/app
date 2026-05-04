import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      console.warn('⚠️ [Mock Mode] STRIPE_SECRET_KEY configuration missing. Payment features will be restricted.');
      // Initialize with a mock key to prevent crashes in dev
      return new Stripe('sk_test_mock', {
        apiVersion: '2025-01-27' as any,
      });
    }
    stripeClient = new Stripe(key, {
      apiVersion: '2025-01-27' as any,
    });
  }
  return stripeClient;
}
