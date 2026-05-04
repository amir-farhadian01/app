import { api } from '../lib/api';

export type ProductRow = {
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
  _count: { bomLines: number };
};

export type ProductListResponse = {
  items: ProductRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type ProductListQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  category?: string;
  isActive?: boolean;
  /** Omit = all; backend `archived=true|false` */
  archived?: 'true' | 'false';
  sortBy?: 'createdAt' | 'name' | 'sku' | 'unitPrice' | 'sortOrder' | 'category' | 'updatedAt';
  sortDir?: 'asc' | 'desc';
};

export type CreateProductBody = {
  name: string;
  sku?: string | null;
  description?: string | null;
  category?: string | null;
  unit?: string;
  unitPrice: number;
  currency?: string;
  stockQuantity?: number | null;
};

export type UpdateProductBody = Partial<{
  name: string;
  sku: string | null;
  description: string | null;
  category: string | null;
  unit: string;
  unitPrice: number;
  currency: string;
  stockQuantity: number | null;
  isActive: boolean;
}>;

function buildQuery(q: ProductListQuery): string {
  const p = new URLSearchParams();
  if (q.page != null) p.set('page', String(q.page));
  if (q.pageSize != null) p.set('pageSize', String(q.pageSize));
  if (q.q?.trim()) p.set('q', q.q.trim());
  if (q.category?.trim()) p.set('category', q.category.trim());
  if (q.isActive === true || q.isActive === false) p.set('isActive', String(q.isActive));
  if (q.archived === 'true' || q.archived === 'false') p.set('archived', q.archived);
  if (q.sortBy) p.set('sortBy', q.sortBy);
  if (q.sortDir) p.set('sortDir', q.sortDir);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function listProducts(
  workspaceId: string,
  query: ProductListQuery = {},
): Promise<ProductListResponse> {
  const q = buildQuery(query);
  return api.get<ProductListResponse>(`/api/workspaces/${workspaceId}/products${q}`);
}

export async function getProduct(workspaceId: string, productId: string): Promise<ProductRow> {
  return api.get<ProductRow>(`/api/workspaces/${workspaceId}/products/${productId}`);
}

export async function createProduct(
  workspaceId: string,
  body: CreateProductBody,
): Promise<ProductRow> {
  return api.post<ProductRow>(`/api/workspaces/${workspaceId}/products`, body);
}

export async function updateProduct(
  workspaceId: string,
  productId: string,
  body: UpdateProductBody,
): Promise<ProductRow> {
  return api.put<ProductRow>(`/api/workspaces/${workspaceId}/products/${productId}`, body);
}

export async function archiveProduct(workspaceId: string, productId: string): Promise<ProductRow> {
  return api.post<ProductRow>(`/api/workspaces/${workspaceId}/products/${productId}/archive`, {});
}

export async function unarchiveProduct(workspaceId: string, productId: string): Promise<ProductRow> {
  return api.post<ProductRow>(`/api/workspaces/${workspaceId}/products/${productId}/unarchive`, {});
}

export async function deleteProduct(workspaceId: string, productId: string): Promise<void> {
  await api.delete(`/api/workspaces/${workspaceId}/products/${productId}`);
}

export async function reorderProducts(workspaceId: string, orderedIds: string[]): Promise<void> {
  await api.post(`/api/workspaces/${workspaceId}/products/reorder`, { orderedIds });
}
