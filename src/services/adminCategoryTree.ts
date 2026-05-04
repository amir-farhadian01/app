import { api } from '../lib/api.js';

const BASE = '/api/admin/categories-tree';

export type ServiceCatalogLite = {
  id: string;
  name: string;
  slug: string | null;
  isActive: boolean;
  sortOrder: number;
  archivedAt: string | null;
  _count: { providerServices: number };
};

export type CategoryTreeItem = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  icon: string | null;
  description: string | null;
  depth: number;
  archivedAt: string | null;
  children: CategoryTreeItem[];
  services: ServiceCatalogLite[];
};

export async function fetchTree(includeArchived = false): Promise<CategoryTreeItem[]> {
  const q = includeArchived ? '?includeArchived=true' : '';
  return api.get<CategoryTreeItem[]>(`/api/categories/tree-with-services${q}`);
}

export async function reorderCategory(id: string, newParentId: string | null, newSortOrder: number) {
  return api.post<{ subtree: unknown; newParentId: string | null }>(`${BASE}/reorder-category`, {
    id,
    newParentId,
    newSortOrder,
  });
}

export async function reorderService(id: string, newCategoryId: string, newSortOrder: number) {
  return api.post<{ ok: boolean; newCategoryId: string }>(`${BASE}/reorder-service`, {
    id,
    newCategoryId,
    newSortOrder,
  });
}

export async function archiveCategory(id: string, cascade: boolean) {
  return api.post<{ id: string; archivedAt: string | null; count: number }>(`${BASE}/archive-category`, {
    id,
    cascade,
  });
}

export async function unarchiveCategory(id: string, cascade: boolean) {
  return api.post<{ id: string; archivedAt: null }>(`${BASE}/unarchive-category`, { id, cascade });
}

export async function archiveService(id: string) {
  return api.post<{ id: string; archivedAt: string }>(`${BASE}/archive-service`, { id });
}

export async function unarchiveService(id: string) {
  return api.post<{ id: string; archivedAt: null }>(`${BASE}/unarchive-service`, { id });
}

export type CreatedCategory = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  icon: string | null;
  description: string | null;
  archivedAt: string | null;
};

export async function createChildCategory(
  parentId: string | null,
  name: string,
  icon?: string,
  description?: string
) {
  return api.post<CreatedCategory>(`${BASE}/create-child-category`, {
    parentId: parentId ?? null,
    name,
    icon,
    description,
  });
}

export async function createLeafService(categoryId: string, name: string, slug?: string) {
  return api.post<{
    id: string;
    name: string;
    slug: string | null;
    categoryId: string;
  }>(`${BASE}/create-leaf-service`, { categoryId, name, slug });
}

export async function renameCategory(id: string, name: string) {
  return api.put<CreatedCategory>(`/api/categories/${id}`, { name });
}

export async function renameService(id: string, name: string) {
  return api.put<{ id: string; name: string }>(`/api/admin/service-definitions/${id}`, { name });
}
