import { api } from '../lib/api';

export type AdminBookingMode = 'auto_appointment' | 'negotiation' | 'inherit_from_catalog';

export type AdminPackageListItem = {
  id: string;
  workspaceId: string;
  serviceCatalogId: string;
  name: string;
  finalPrice: number;
  currency: string;
  bookingMode: AdminBookingMode;
  isActive: boolean;
  archivedAt: string | null;
  updatedAt: string;
  workspace: { id: string; name: string; logoUrl: string | null; slug: string | null; ownerId: string };
  provider: { id: string; displayName: string | null; email: string | null; role: string };
  serviceCatalog: {
    id: string;
    name: string;
    category: string;
    lockedBookingMode: string | null;
    archivedAt?: string | null;
  };
};

export type ListAllParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  workspaceId?: string;
  serviceCatalogId?: string;
  bookingMode?: string[];
  isActive?: boolean;
};

export type ListAllResponse = {
  items: AdminPackageListItem[];
  total: number;
  page: number;
  pageSize: number;
};

function buildQuery(p: ListAllParams): string {
  const u = new URLSearchParams();
  if (p.page != null) u.set('page', String(p.page));
  if (p.pageSize != null) u.set('pageSize', String(p.pageSize));
  if (p.q) u.set('q', p.q);
  if (p.workspaceId) u.set('workspaceId', p.workspaceId);
  if (p.serviceCatalogId) u.set('serviceCatalogId', p.serviceCatalogId);
  if (p.isActive === true) u.set('isActive', 'true');
  if (p.isActive === false) u.set('isActive', 'false');
  if (p.bookingMode?.length) {
    for (const b of p.bookingMode) u.append('bookingMode', b);
  }
  const s = u.toString();
  return s ? `?${s}` : '';
}

export async function listAll(params: ListAllParams): Promise<ListAllResponse> {
  return api.get<ListAllResponse>(`/api/admin/service-packages${buildQuery(params)}`);
}

export type AdminBomLineProduct = {
  id: string;
  name: string;
  sku: string | null;
  archivedAt: string | null;
  unitPrice: number;
  currency: string;
};

export type AdminBomLine = {
  id: string;
  packageId: string;
  productId: string;
  quantity: number;
  snapshotUnitPrice: number;
  snapshotCurrency: string;
  snapshotProductName: string;
  snapshotUnit: string;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  product: AdminBomLineProduct;
};

export type AdminPackageMargin = {
  currency: string;
  bomCost: number;
  crossCurrencyLines: number;
  margin: number;
  marginPercent: number;
};

export type AdminPackageDetail = AdminPackageListItem & {
  description: string | null;
  durationMinutes: number | null;
  createdAt: string;
  bom?: AdminBomLine[];
  margin?: AdminPackageMargin;
};

export async function getPackage(id: string) {
  return api.get<AdminPackageDetail>(`/api/admin/service-packages/${id}`);
}

export async function forceArchive(id: string) {
  return api.post<AdminPackageListItem>(`/api/admin/service-packages/${id}/force-archive`);
}

export async function listByCatalog(catalogId: string) {
  return api.get<AdminPackageListItem[]>(`/api/admin/service-packages/by-catalog/${catalogId}`);
}
