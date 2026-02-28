// API Client configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api-dev.volantislive.com';

const DEBUG = process.env.NODE_ENV !== 'production';

function debugLog(...args: any[]) {
  if (DEBUG) {
    console.log('[API]', ...args);
  }
}

function debugError(...args: any[]) {
  if (DEBUG) {
    console.error('[API]', ...args);
  }
}

export const apiClient = {
  baseUrl: API_BASE_URL,
  
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    debugLog(`${options.method || 'GET'} ${endpoint}`);
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    // Add auth token if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${token}`,
        };
      }
    }

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      debugError(`ERROR ${response.status} on ${endpoint}:`, error);
      throw error;
    }

    // Handle empty responses
    const text = await response.text();
    const result = text ? JSON.parse(text) : (null as unknown as T);
    debugLog(`RESPONSE ${endpoint}:`, result);
    return result;
  },

  async requestFormData<T>(
    endpoint: string,
    data: FormData,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    debugLog(`POST (FormData) ${endpoint}`);
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    
    const config: RequestInit = {
      ...options,
      method: options.method || 'POST',
      body: data,
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      debugError(`ERROR ${response.status} on ${endpoint}:`, error);
      throw error;
    }

    const text = await response.text();
    const result = text ? JSON.parse(text) : (null as unknown as T);
    debugLog(`RESPONSE ${endpoint}:`, result);
    return result;
  },

  async requestWithAuth<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    return this.request<T>(endpoint, options);
  }
};

export default apiClient;
