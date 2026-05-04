export type AdminTab =
  | 'overview'
  | 'users'
  | 'kyc'
  | 'service-definitions'
  | 'service-packages'
  | 'inventory'
  | 'orders'
  | 'finance'
  | 'payments'
  | 'teams'
  | 'content'
  | 'monitoring'
  | 'chat-moderation'
  | 'contracts'
  | 'integrations'
  | 'legal'
  | 'settings';

export const ALL_ADMIN_TABS: AdminTab[] = [
  'overview',
  'users',
  'kyc',
  'service-definitions',
  'service-packages',
  'inventory',
  'orders',
  'finance',
  'payments',
  'teams',
  'content',
  'monitoring',
  'chat-moderation',
  'contracts',
  'integrations',
  'legal',
  'settings',
];

export function isAdminTab(s: string | null): s is AdminTab {
  return s != null && ALL_ADMIN_TABS.includes(s as AdminTab);
}
