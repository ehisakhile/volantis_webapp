// Subscriptions API Service
import { apiClient } from './client';

export interface CompanySubscription {
  id: number;
  company_id: number;
  user_id: number;
  subscribed_at: string;
}

export interface SubscriberCountResponse {
  company_slug: string;
  count: number;
}

export interface CompanyStatsResponse {
  company_slug: string;
  total_streams: number;
  total_streamed_time_minutes: number;
  subscriber_count: number;
  current_viewers: number;
  is_live: boolean;
  active_stream_title: string | null;
}

export const subscriptionsApi = {
  /**
   * Subscribe to a company channel
   * Requires authentication
   */
  async subscribe(companySlug: string): Promise<void> {
    await apiClient.request(`/subscriptions/${encodeURIComponent(companySlug)}/subscribe`, {
      method: 'POST',
    });
  },

  /**
   * Unsubscribe from a company channel
   * Requires authentication
   */
  async unsubscribe(companySlug: string): Promise<void> {
    await apiClient.request(`/subscriptions/${encodeURIComponent(companySlug)}/unsubscribe`, {
      method: 'DELETE',
    });
  },

  /**
   * Get all subscriptions for the current user
   * Requires authentication
   */
  async getMySubscriptions(): Promise<CompanySubscription[]> {
    const response = await apiClient.request<CompanySubscription[]>('/subscriptions', {
      method: 'GET',
    });
    return response;
  },

  /**
   * Get subscriber count for a company
   * Public endpoint - no authentication required
   */
  async getSubscriberCount(companySlug: string): Promise<SubscriberCountResponse> {
    const response = await apiClient.request<SubscriberCountResponse>(
      `/subscriptions/${encodeURIComponent(companySlug)}/subscribers/count`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Get streaming statistics for a company
   * Public endpoint - no authentication required
   */
  async getCompanyStats(companySlug: string): Promise<CompanyStatsResponse> {
    const response = await apiClient.request<CompanyStatsResponse>(
      `/subscriptions/${encodeURIComponent(companySlug)}/stats`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Check if current user is subscribed to a company
   * Requires authentication
   */
  async checkSubscription(companySlug: string): Promise<{ is_subscribed: boolean }> {
    const response = await apiClient.request<{ is_subscribed: boolean }>(
      `/subscriptions/${encodeURIComponent(companySlug)}/check`,
      { method: 'GET' }
    );
    return response;
  },
};

export default subscriptionsApi;
