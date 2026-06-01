// Auth API Service
import { apiClient } from './client';
import { setAuthCookies, clearAuthCookies, setUserCookie } from './cookies';
import type {
  LoginRequest,
  SignupRequest,
  UserSignupRequest,
  VolTokenResponse,
  VolSignupResponse,
  VolUserResponse,
  Subscription
} from '@/types/auth';

function storeTokens(response: VolTokenResponse | VolSignupResponse) {
  setAuthCookies(response.access_token, response.refresh_token, response.expires_in || 3600);
}

export const authApi = {
  /**
   * Login with email and password
   */
  async login(data: LoginRequest): Promise<VolTokenResponse> {
    const formData = new URLSearchParams();
    formData.append('email', data.email);
    formData.append('password', data.password);

    const response = await apiClient.request<VolTokenResponse>('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    storeTokens(response);
    return response;
  },

  /**
   * Admin login - only for platform superadmin
   */
  async adminLogin(data: LoginRequest): Promise<VolTokenResponse> {
    const formData = new URLSearchParams();
    formData.append('email', data.email);
    formData.append('password', data.password);

    const response = await apiClient.request<VolTokenResponse>('/auth/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    storeTokens(response);
    return response;
  },

  /**
   * Register a new company with an admin user
   */
  async signup(data: SignupRequest): Promise<VolSignupResponse> {
    const formData = new FormData();
    formData.append('company_name', data.company_name);
    formData.append('email', data.email);
    formData.append('password', data.password);
    
    if (data.company_slug) {
      formData.append('company_slug', data.company_slug);
    }
    if (data.company_description) {
      formData.append('company_description', data.company_description);
    }
    if (data.user_username) {
      formData.append('user_username', data.user_username);
    }
    if (data.logo) {
      formData.append('logo', data.logo);
    }

    const response = await apiClient.requestFormData<VolSignupResponse>('/auth/signup', formData);

    if (response.access_token && response.refresh_token) {
      storeTokens(response);
    }

    return response;
  },

  /**
   * Register a new individual user account (not tied to a company)
   * This is for viewers who want to follow channels and receive notifications.
   */
  async signupUser(data: UserSignupRequest): Promise<VolSignupResponse> {
    const formData = new URLSearchParams();
    formData.append('email', data.email);
    formData.append('password', data.password);
    formData.append('username', data.username);

    const response = await apiClient.request<VolSignupResponse>('/auth/signup/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (response.access_token && response.refresh_token) {
      storeTokens(response);
    }

    return response;
  },

  /**
   * Subscribe/follow a company to receive notifications about their streams.
   */
  async subscribeToCompany(companySlug: string): Promise<void> {
    await apiClient.request(`/auth/subscribe/${encodeURIComponent(companySlug)}`, {
      method: 'POST',
    });
  },

  /**
   * Unsubscribe/unfollow a company.
   */
  async unsubscribeFromCompany(companySlug: string): Promise<void> {
    await apiClient.request(`/auth/subscribe/${encodeURIComponent(companySlug)}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get list of companies the current user is subscribed to.
   */
  async getMySubscriptions(): Promise<Subscription[]> {
    const response = await apiClient.request<Subscription[]>('/subscriptions', {
      method: 'GET',
    });
    return response;
  },

  /**
   * Verify email with OTP
   * Uses form data: user_id and otp
   */
  async verifyEmailWithOTP(userId: number, otp: string): Promise<void> {
    const formData = new URLSearchParams();
    formData.append('user_id', String(userId));
    formData.append('otp', otp);

    await apiClient.request('/auth/verify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
  },

  /**
   * Resend verification OTP email
   */
  async resendVerification(email: string): Promise<void> {
    await apiClient.request(`/auth/resend-verification?email=${encodeURIComponent(email)}`, {
      method: 'POST',
    });
  },

  /**
   * Check if user's email is verified
   */
  async checkEmailVerification(): Promise<{ is_verified: boolean }> {
    const response = await apiClient.request<{ is_verified: boolean }>('/auth/verification-status', {
      method: 'GET',
    });
    return { is_verified: response.is_verified };
  },

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.request('/auth/logout', {
        method: 'POST',
      });
    } finally {
      clearAuthCookies();
    }
  },

  /**
   * Get current user info
   */
  async getMe(): Promise<VolUserResponse> {
    const response = await apiClient.request<VolUserResponse>('/auth/me', {
      method: 'GET',
    });

    setUserCookie(response);
    return response;
  },

  /**
   * Check if user is authenticated (client-side check)
   */
  isAuthenticated(): boolean {
    if (typeof document === 'undefined') return false;
    return !!document.cookie.includes('vol_access_token=');
  },

  /**
   * Get stored user
   */
  getStoredUser(): VolUserResponse | null {
    if (typeof window === 'undefined') return null;
    if (typeof document === 'undefined') return null;
    
    const match = document.cookie.match(/vol_user=([^;]+)/);
    if (!match) return null;
    
    try {
      return JSON.parse(decodeURIComponent(match[1]));
    } catch {
      return null;
    }
  },

  /**
   * Clear auth data
   */
  clearAuth(): void {
    clearAuthCookies();
  },

  /**
   * Request password reset - sends OTP to user's email
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const response = await apiClient.request<{ message: string }>('/auth/password-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    return response;
  },

  /**
   * Verify OTP and set new password
   */
  async verifyPasswordReset(email: string, otp: string, newPassword: string): Promise<VolTokenResponse> {
    const response = await apiClient.request<VolTokenResponse>('/auth/password-reset/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        otp,
        new_password: newPassword,
      }),
    });

    storeTokens(response);
    return response;
  },
};

export default authApi;
