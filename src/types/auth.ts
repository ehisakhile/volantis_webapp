// Auth Types based on OpenAPI specification

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  company_name: string;
  company_slug?: string | null;
  company_description?: string | null;
  email: string;
  user_username?: string | null;
  password: string;
  logo?: File | null;
}

// Individual user signup (not tied to a company) - for viewers who want to follow channels
export interface UserSignupRequest {
  email: string;
  password: string;
  username: string;
}

export interface VolTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface VolSignupResponse {
  message?: string | null;
  email?: string | null;
  company_slug?: string | null;
  requires_verification?: boolean | null;
  access_token?: string | null;
  refresh_token?: string | null;
  token_type?: string | null;
  expires_in?: number | null;
}

export interface VolUserResponse {
  id: number;
  company_id: number;
  company_name?: string | null;
  company_slug?: string | null;
  email: string;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  user: VolUserResponse | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ApiError {
  detail?: string;
  message?: string;
  [key: string]: unknown;
}
