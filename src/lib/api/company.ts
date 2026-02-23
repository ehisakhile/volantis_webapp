// Company API Service
import { apiClient } from './client';
import type { 
  VolCompanyResponse, 
  EditCompanyRequest 
} from '@/types/company';

export const companyApi = {
  /**
   * Get current user's company info
   */
  async getMyCompany(): Promise<VolCompanyResponse> {
    const response = await apiClient.request<VolCompanyResponse>('/companies/me', {
      method: 'GET',
    });

    return response;
  },

  /**
   * Edit current user's company profile
   * - name: can only be changed once every 30 days
   * - slug: can only be changed once every 30 days
   * - description: can be changed anytime
   * - logo: optional logo file upload
   */
  async editMyCompany(data: EditCompanyRequest): Promise<VolCompanyResponse> {
    const formData = new FormData();

    if (data.name) {
      formData.append('name', data.name);
    }
    if (data.slug) {
      formData.append('slug', data.slug);
    }
    if (data.description) {
      formData.append('description', data.description);
    }
    if (data.logo) {
      formData.append('logo', data.logo);
    }

    const response = await apiClient.requestFormData<VolCompanyResponse>('/companies/me', formData, {
      method: 'PUT',
    });

    return response;
  },

  /**
   * Delete current user's company and ALL associated data
   * This will permanently delete:
   * - The company
   * - All company users
   * - All livestreams
   * - All recordings
   * This action cannot be undone!
   */
  async deleteMyCompany(): Promise<void> {
    await apiClient.request('/companies/me', {
      method: 'DELETE',
    });
  },

  /**
   * Get public company page by slug
   */
  async getCompanyPage(companySlug: string): Promise<unknown> {
    const response = await apiClient.request(`/companies/${encodeURIComponent(companySlug)}`, {
      method: 'GET',
    });

    return response;
  },
};

export default companyApi;
