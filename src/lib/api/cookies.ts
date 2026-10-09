const COOKIE_DOMAIN = '.volantislive.com';
const COOKIE_PATH = '/';

function cookieAttrs(maxAge: number): string {
  const parts = [`path=${COOKIE_PATH}`, `max-age=${maxAge}`, 'SameSite=Lax'];

  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;

    if (protocol === 'https:') {
      parts.push('Secure');
    }

    // Preview deployments and localhost need host-only cookies. Browsers reject
    // .volantislive.com cookies when they are set from an unrelated host.
    if (hostname === 'volantislive.com' || hostname.endsWith('.volantislive.com')) {
      parts.push(`domain=${COOKIE_DOMAIN}`);
    }
  }

  return parts.join('; ');
}

export function setAuthCookies(
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): void {
  if (typeof document === 'undefined') return;

  const attrs = cookieAttrs(expiresIn);

  document.cookie = `vol_access_token=${encodeURIComponent(accessToken)}; ${attrs}`;
  document.cookie = `vol_refresh_token=${encodeURIComponent(refreshToken)}; ${attrs}`;
  document.cookie = `vol_token_expires=${encodeURIComponent(String(expiresIn))}; ${attrs}`;
}

export function clearAuthCookies(): void {
  if (typeof document === 'undefined') return;

  const attrs = cookieAttrs(0);

  ['vol_access_token', 'vol_refresh_token', 'vol_token_expires', 'vol_user'].forEach(name => {
    document.cookie = `${name}=; ${attrs}`;
  });
}

export function setUserCookie(user: object): void {
  if (typeof document === 'undefined') return;

  const expiresIn = 7 * 24 * 60 * 60;
  document.cookie = `vol_user=${encodeURIComponent(JSON.stringify(user))}; ${cookieAttrs(expiresIn)}`;
}

export function getAccessTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/vol_access_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function getRefreshTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/vol_refresh_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
