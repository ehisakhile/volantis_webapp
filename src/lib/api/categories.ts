import { apiClient } from './client';

export interface Category {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  display_order: number;
  created_by_company_id: number | null;
  usage_count: number;
  is_system: number;
  is_active: number;
  created_at: string;
}

export interface CategoriesResponse {
  items: Category[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export const categoriesApi = {
  async getCategories(page: number = 1, limit: number = 20): Promise<CategoriesResponse> {
    const response = await apiClient.request<CategoriesResponse>(
      `/categories?page=${page}&limit=${limit}`,
      { method: 'GET' }
    );
    return response;
  },

  async getMyCompanyPreferences(): Promise<Category[]> {
    const response = await apiClient.request<Category[]>(
      '/categories/preferences/my-company',
      { method: 'GET' }
    );
    return response;
  },

  async setMyCompanyPreferences(categoryIds: number[]): Promise<Category[]> {
    const response = await apiClient.request<Category[]>(
      '/categories/preferences/my-company',
      {
        method: 'PUT',
        body: JSON.stringify({ category_ids: categoryIds }),
      }
    );
    return response;
  },
};

export default categoriesApi;