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

export interface UserSubscription {
  company_id: number;
  company_name: string;
  company_slug: string;
  company_logo_url: string | null;
  subscribed_at: string;
  is_live: boolean;
  current_viewers: number;
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
   * Get all user subscriptions with company details
   * Requires authentication
   */
  async getUserSubscriptions(): Promise<UserSubscription[]> {
    const response = await apiClient.request<UserSubscription[]>('/subscriptions', {
      method: 'GET',
    });
    return response;
  },

  /**
   * Check if current user is subscribed to a company by slug
   * Requires authentication - fetches all subscriptions and matches slug
   */
  async checkSubscriptionBySlug(companySlug: string): Promise<boolean> {
    try {
      const subscriptions = await apiClient.request<UserSubscription[]>('/subscriptions', {
        method: 'GET',
      });
      return subscriptions.some(sub => sub.company_slug === companySlug);
    } catch {
      return false;
    }
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
