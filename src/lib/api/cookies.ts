const COOKIE_DOMAIN = '.volantislive.com';
const COOKIE_PATH = '/';
const SECURE = process.env.NODE_ENV === 'production';

export function setAuthCookies(
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): void {
  if (typeof document === 'undefined') return;

  const maxAge = expiresIn;

  document.cookie = `vol_access_token=${encodeURIComponent(accessToken)}; path=${COOKIE_PATH}; max-age=${maxAge}; same-site=lax${SECURE ? '; secure' : ''}${process.env.NODE_ENV === 'production' ? `; domain=${COOKIE_DOMAIN}` : ''}`;

  document.cookie = `vol_refresh_token=${encodeURIComponent(refreshToken)}; path=${COOKIE_PATH}; max-age=${maxAge}; same-site=lax${SECURE ? '; secure' : ''}${process.env.NODE_ENV === 'production' ? `; domain=${COOKIE_DOMAIN}` : ''}`;

  document.cookie = `vol_token_expires=${encodeURIComponent(String(expiresIn))}; path=${COOKIE_PATH}; max-age=${maxAge}; same-site=lax${SECURE ? '; secure' : ''}${process.env.NODE_ENV === 'production' ? `; domain=${COOKIE_DOMAIN}` : ''}`;
}

export function clearAuthCookies(): void {
  if (typeof document === 'undefined') return;

  document.cookie = `vol_access_token=; path=${COOKIE_PATH}; max-age=0${process.env.NODE_ENV === 'production' ? `; domain=${COOKIE_DOMAIN}` : ''}`;
  document.cookie = `vol_refresh_token=; path=${COOKIE_PATH}; max-age=0${process.env.NODE_ENV === 'production' ? `; domain=${COOKIE_DOMAIN}` : ''}`;
  document.cookie = `vol_token_expires=; path=${COOKIE_PATH}; max-age=0${process.env.NODE_ENV === 'production' ? `; domain=${COOKIE_DOMAIN}` : ''}`;
  document.cookie = `vol_user=; path=${COOKIE_PATH}; max-age=0${process.env.NODE_ENV === 'production' ? `; domain=${COOKIE_DOMAIN}` : ''}`;
}

export function setUserCookie(user: object): void {
  if (typeof document === 'undefined') return;

  const expiresIn = 7 * 24 * 60 * 60;
  document.cookie = `vol_user=${encodeURIComponent(JSON.stringify(user))}; path=${COOKIE_PATH}; max-age=${expiresIn}; same-site=lax${SECURE ? '; secure' : ''}${process.env.NODE_ENV === 'production' ? `; domain=${COOKIE_DOMAIN}` : ''}`;
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