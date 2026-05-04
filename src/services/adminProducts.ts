import { api } from '../lib/api';

export type AdminProductWorkspace = {
  id: string;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  ownerId: string;
};

export type AdminProductListItem = {
  id: string;
  workspaceId: string;
  name: string;
  sku: string | null;
  description: string | null;
  category: string | null;
  unit: string;
  unitPrice: number;
  currency: string;
  stockQuantity: number | null;
  isActive: boolean;
  archivedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  workspace: AdminProductWorkspace;
  _count: { bomLines: number };
};

export type AdminProductUsedInPackage = {
  id: string;
  name: string;
  finalPrice: number;
  currency: string;
  isActive: boolean;
  archivedAt: string | null;
  workspaceId: string;
  workspace: { id: string; name: string; logoUrl: string | null; slug: string | null };
};

export type AdminProductDetail = AdminProductListItem & {
  usedInPackages: AdminProductUsedInPackage[];
};

export type AdminProductListQuery = {
  page?: number;
  pageSize?: number;
  workspaceId?: string;
  q?: string;
  category?: string;
  isActive?: boolean;
  archived?: 'true' | 'false';
  sortBy?: 'createdAt' | 'name' | 'sku' | 'unitPrice' | 'sortOrder' | 'category' | 'updatedAt';
  sortDir?: 'asc' | 'desc';
};

export type AdminProductListResponse = {
  items: AdminProductListItem[];
  total: number;
  page: number;
  pageSize: number;
};

function buildQuery(q: AdminProductListQuery): string {
  const p = new URLSearchParams();
  if (q.page != null) p.set('page', String(q.page));
  if (q.pageSize != null) p.set('pageSize', String(q.pageSize));
  if (q.workspaceId?.trim()) p.set('workspaceId', q.workspaceId.trim());
  if (q.q?.trim()) p.set('q', q.q.trim());
  if (q.category?.trim()) p.set('category', q.category.trim());
  if (q.isActive === true || q.isActive === false) p.set('isActive', String(q.isActive));
  if (q.archived === 'true' || q.archived === 'false') p.set('archived', q.archived);
  if (q.sortBy) p.set('sortBy', q.sortBy);
  if (q.sortDir) p.set('sortDir', q.sortDir);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function listAll(query: AdminProductListQuery = {}): Promise<AdminProductListResponse> {
  const qs = buildQuery(query);
  return api.get<AdminProductListResponse>(`/api/admin/products${qs}`);
}

export async function get(id: string): Promise<AdminProductDetail> {
  return api.get<AdminProductDetail>(`/api/admin/products/${id}`);
}

export type WorkspaceFilterOption = { id: string; name: string; slug: string | null; logoUrl: string | null };

export async function listWorkspacesForFilter(): Promise<{ items: WorkspaceFilterOption[] }> {
  return api.get<{ items: WorkspaceFilterOption[] }>('/api/admin/products/meta/workspaces');
}
