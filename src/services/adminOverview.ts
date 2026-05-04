/** Response shape for GET /api/admin/stats */
export type AdminOverviewStats = {
  totalUsers: number;
  kycPending: number;
  activeOrders: number;
  ordersToday: number;
  totalProviders: number;
  matchRate: number;
  avgTimeToMatch: number;
  revenueTotal: number;
  revenuePending: number;
};

export type OrdersTrendPoint = { date: string; count: number };

export type AdminAuditLogFeedItem = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  timestamp: string;
  actor: { id: string; displayName: string | null; email: string | null } | null;
};

export type AdminAuditLogFeedResponse = { items: AdminAuditLogFeedItem[] };
