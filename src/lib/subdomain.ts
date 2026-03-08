const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'volantislive.com';
const USE_SUBDOMAINS = process.env.NEXT_PUBLIC_USE_SUBDOMAINS === 'true';

export function getBaseDomain(): string {
  return BASE_DOMAIN;
}

export function shouldUseSubdomains(): boolean {
  return USE_SUBDOMAINS;
}

export function parseSubdomain(host: string): string | null {
  if (!host) return null;
  
  const cleanHost = host.replace(/^https?:\/\//, '').split(':')[0];
  
  const baseDomain = BASE_DOMAIN.replace(/^www\./, '');
  
  if (cleanHost === baseDomain || cleanHost === `www.${baseDomain}`) {
    return null;
  }
  
  if (cleanHost.endsWith(`.${baseDomain}`)) {
    const subdomain = cleanHost.replace(`.${baseDomain}`, '');
    if (subdomain && subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'app') {
      return subdomain;
    }
  }
  
  return null;
}

export function isValidCompanySlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  
  const validSlugRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
  const reservedWords = ['www', 'api', 'app', 'admin', 'login', 'signup', 'dashboard', 'listen', 'pricing', 'about', 'contact', 'features', 'how-it-works', 'solutions', 'verify', 'resend-verification', 'subscription', 'user', 'creator'];
  
  if (!validSlugRegex.test(slug)) return false;
  if (reservedWords.includes(slug.toLowerCase())) return false;
  if (slug.length < 2 || slug.length > 63) return false;
  
  return true;
}

export function buildSubdomainUrl(companySlug: string, path: string = ''): string {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const port = process.env.NODE_ENV === 'development' ? ':3000' : '';
  const cleanSlug = companySlug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const cleanPath = path ? `/${path.replace(/^\/+/, '')}` : '';
  
  return `${protocol}://${cleanSlug}.${BASE_DOMAIN}${port}${cleanPath}`;
}

export function buildPathUrl(companySlug: string, path: string = ''): string {
  const cleanSlug = companySlug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const cleanPath = path ? `/${path.replace(/^\/+/, '')}` : '';
  
  return `/${cleanSlug}${cleanPath}`;
}

export function getCompanyUrl(companySlug: string, path: string = ''): string {
  if (USE_SUBDOMAINS && isValidCompanySlug(companySlug)) {
    return buildSubdomainUrl(companySlug, path);
  }
  return buildPathUrl(companySlug, path);
}

export function getCurrentHost(headers: Headers | Record<string, unknown>): string | null {
  let hostValue: unknown = null;
  
  if (typeof headers.get === 'function') {
    hostValue = headers.get('host');
  } else if (headers && typeof headers === 'object') {
    hostValue = (headers as Record<string, unknown>).host;
  }
  
  if (Array.isArray(hostValue)) return hostValue[0] || null;
  if (typeof hostValue === 'string') return hostValue;
  return null;
}

export function isSubdomainRequest(host: string | null): boolean {
  if (!host) return false;
  const subdomain = parseSubdomain(host);
  return subdomain !== null;
}

export function getCompanyFromRequest(headers: Headers | Record<string, unknown>): string | null {
  const host = getCurrentHost(headers);
  if (!host) return null;
  
  return parseSubdomain(host);
}

export function normalizeCompanySlug(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function getUrlOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const port = process.env.NODE_ENV === 'development' ? ':3000' : '';
  return `${protocol}://${BASE_DOMAIN}${port}`;
}
