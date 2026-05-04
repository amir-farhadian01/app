import { api } from '../lib/api';
import type { ServiceQuestionnaireV1 } from '../../lib/serviceDefinitionTypes';

export type ServiceCatalogCategory = { id: string; name: string; parentId: string | null };

export type ServiceCatalogListItem = {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  complianceTags: string[];
  categoryId: string | null;
  category_: ServiceCatalogCategory | null;
  defaultMatchingMode: string;
  isActive: boolean;
  description: string | null;
  slug: string | null;
  createdAt: string;
  updatedAt: string;
  dynamicFieldsSchema: ServiceQuestionnaireV1 | null;
  lockedBookingMode: string | null;
  _count: { services: number };
};

export type ListServiceDefinitionsResponse = {
  items: ServiceCatalogListItem[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    isActive: Record<string, number>;
    byCategory: { categoryId: string | null; count: number }[];
  };
};

export type ListQuery = Record<string, string | number | string[] | undefined | null>;

function buildQuery(q: ListQuery): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      for (const x of v) {
        if (x !== undefined && x !== null && x !== '') usp.append(k, String(x));
      }
    } else {
      usp.set(k, String(v));
    }
  }
  return usp.toString();
}

export async function listServiceDefinitions(query: ListQuery): Promise<ListServiceDefinitionsResponse> {
  const qs = buildQuery(query);
  return api.get<ListServiceDefinitionsResponse>(`/api/admin/service-definitions?${qs}`);
}

export async function getServiceDefinition(id: string): Promise<ServiceCatalogListItem> {
  return api.get<ServiceCatalogListItem>(`/api/admin/service-definitions/${id}`);
}

export type CreateServiceDefinitionBody = {
  name: string;
  category: string;
  subcategory?: string | null;
  complianceTags?: string[];
  categoryId?: string | null;
  dynamicFieldsSchema?: ServiceQuestionnaireV1 | null;
  defaultMatchingMode?: string;
  description?: string | null;
  slug?: string | null;
  isActive?: boolean;
  lockedBookingMode?: string | null;
};

export async function createServiceDefinition(body: CreateServiceDefinitionBody) {
  return api.post<ServiceCatalogListItem>('/api/admin/service-definitions', body);
}

export type UpdateServiceDefinitionBody = Partial<CreateServiceDefinitionBody> & {
  name?: string;
  category?: string;
};

export async function updateServiceDefinition(id: string, body: UpdateServiceDefinitionBody) {
  return api.put<ServiceCatalogListItem>(`/api/admin/service-definitions/${id}`, body);
}

export async function deleteServiceDefinition(id: string) {
  return api.delete<{ success: boolean }>(`/api/admin/service-definitions/${id}`);
}

export async function previewServiceDefinition(id: string) {
  return api.get<{ schema: ServiceQuestionnaireV1 | null; sampleAnswers: Record<string, never> }>(
    `/api/admin/service-definitions/${id}/preview`
  );
}

export type CategoryTreeNode = {
  id: string;
  name: string;
  parentId: string | null;
  description: string | null;
  icon: string | null;
  children: CategoryTreeNode[];
};

export async function getCategoryTree() {
  return api.get<CategoryTreeNode[]>('/api/categories/tree');
}
