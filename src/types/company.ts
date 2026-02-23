// Company Types based on OpenAPI specification

export interface VolCompanyResponse {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  email: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface EditCompanyRequest {
  name?: string;
  slug?: string;
  description?: string;
  logo?: File | null;
}

export interface CompanyState {
  company: VolCompanyResponse | null;
  isLoading: boolean;
  error: string | null;
}
