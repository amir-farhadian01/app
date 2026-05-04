import { api } from '../lib/api';

export type WorkspaceListItem = {
  id: string;
  name: string;
  logoUrl: string | null;
  slug: string | null;
  role: string;
  isOwner: boolean;
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  slogan: string | null;
  about: string | null;
  kycStatus: string;
  type: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceMember = {
  companyId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    role: string;
    status: string;
    phone: string | null;
  };
};

export type BookingMode = 'auto_appointment' | 'negotiation' | 'inherit_from_catalog';

export type PackageMarginBlock = {
  currency: string;
  bomCost: number;
  crossCurrencyLines: number;
  margin: number;
  marginPercent: number;
};

export type ProviderServicePackageRow = {
  id: string;
  providerId: string;
  workspaceId: string;
  serviceCatalogId: string;
  name: string;
  description: string | null;
  finalPrice: number;
  currency: string;
  bookingMode: BookingMode;
  durationMinutes: number | null;
  isActive: boolean;
  archivedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  serviceCatalog: {
    id: string;
    name: string;
    category: string;
    archivedAt: string | null;
    lockedBookingMode: string | null;
  };
  provider: { id: string; displayName: string | null; email: string | null };
  _count?: { bom: number };
  margin?: PackageMarginBlock;
};

export type BomLineProduct = {
  id: string;
  name: string;
  sku: string | null;
  archivedAt: string | null;
  unitPrice: number;
  currency: string;
};

export type BomLine = {
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
  product: BomLineProduct;
};

export async function getPackageBom(
  workspaceId: string,
  packageId: string,
): Promise<{ lines: BomLine[]; margin: PackageMarginBlock }> {
  return api.get(`/api/workspaces/${workspaceId}/service-packages/${packageId}/bom`);
}

export async function addBomLine(
  workspaceId: string,
  packageId: string,
  body: { productId: string; quantity: number; notes?: string | null },
): Promise<BomLine> {
  return api.post(`/api/workspaces/${workspaceId}/service-packages/${packageId}/bom`, body);
}

export async function updateBomLine(
  workspaceId: string,
  packageId: string,
  lineId: string,
  body: { quantity?: number; notes?: string | null },
): Promise<BomLine> {
  return api.put(`/api/workspaces/${workspaceId}/service-packages/${packageId}/bom/${lineId}`, body);
}

export async function deleteBomLine(workspaceId: string, packageId: string, lineId: string): Promise<void> {
  await api.delete(`/api/workspaces/${workspaceId}/service-packages/${packageId}/bom/${lineId}`);
}

export async function refreshBomLineSnapshot(
  workspaceId: string,
  packageId: string,
  lineId: string,
): Promise<BomLine> {
  return api.post(
    `/api/workspaces/${workspaceId}/service-packages/${packageId}/bom/${lineId}/refresh-snapshot`,
    {},
  );
}

export async function refreshAllBomSnapshots(
  workspaceId: string,
  packageId: string,
): Promise<{ lines: BomLine[]; margin: PackageMarginBlock }> {
  return api.post(`/api/workspaces/${workspaceId}/service-packages/${packageId}/bom/refresh-all`, {});
}

export async function reorderBomLines(
  workspaceId: string,
  packageId: string,
  orderedIds: string[],
): Promise<void> {
  await api.post(`/api/workspaces/${workspaceId}/service-packages/${packageId}/bom/reorder`, {
    orderedIds,
  });
}

export async function listMyWorkspaces(): Promise<WorkspaceListItem[]> {
  return api.get<WorkspaceListItem[]>('/api/workspaces/me');
}

export async function getWorkspace(id: string): Promise<WorkspaceSummary> {
  return api.get<WorkspaceSummary>(`/api/workspaces/${id}`);
}

export async function listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  return api.get<WorkspaceMember[]>(`/api/workspaces/${workspaceId}/members`);
}

export async function listPackages(
  workspaceId: string,
  opts?: { serviceCatalogId?: string; includeArchived?: boolean }
): Promise<ProviderServicePackageRow[]> {
  const p = new URLSearchParams();
  if (opts?.serviceCatalogId) p.set('serviceCatalogId', opts.serviceCatalogId);
  if (opts?.includeArchived) p.set('includeArchived', 'true');
  const q = p.toString();
  return api.get<ProviderServicePackageRow[]>(
    `/api/workspaces/${workspaceId}/service-packages${q ? `?${q}` : ''}`
  );
}

export type CreatePackageBody = {
  serviceCatalogId: string;
  name: string;
  description?: string | null;
  finalPrice: number;
  bookingMode: BookingMode;
  durationMinutes?: number | null;
  currency?: string;
};

export type UpdatePackageBody = Partial<{
  name: string;
  description: string | null;
  finalPrice: number;
  bookingMode: BookingMode;
  durationMinutes: number | null;
  isActive: boolean;
  currency: string;
}>;

export async function createPackage(
  workspaceId: string,
  body: CreatePackageBody
): Promise<ProviderServicePackageRow> {
  return api.post<ProviderServicePackageRow>(`/api/workspaces/${workspaceId}/service-packages`, body);
}

export async function updatePackage(
  workspaceId: string,
  pkgId: string,
  body: UpdatePackageBody
): Promise<ProviderServicePackageRow> {
  return api.put<ProviderServicePackageRow>(
    `/api/workspaces/${workspaceId}/service-packages/${pkgId}`,
    body
  );
}

export async function archivePackage(
  workspaceId: string,
  pkgId: string
): Promise<ProviderServicePackageRow> {
  return api.post<ProviderServicePackageRow>(
    `/api/workspaces/${workspaceId}/service-packages/${pkgId}/archive`
  );
}

export async function unarchivePackage(
  workspaceId: string,
  pkgId: string
): Promise<ProviderServicePackageRow> {
  return api.post<ProviderServicePackageRow>(
    `/api/workspaces/${workspaceId}/service-packages/${pkgId}/unarchive`
  );
}

export async function reorderPackages(
  workspaceId: string,
  orderedIds: string[]
): Promise<void> {
  await api.post(`/api/workspaces/${workspaceId}/service-packages/reorder`, { orderedIds });
}

export async function deletePackage(workspaceId: string, pkgId: string): Promise<void> {
  await api.delete(`/api/workspaces/${workspaceId}/service-packages/${pkgId}`);
}
