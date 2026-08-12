import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { parseSubdomain, isValidCompanySlug, getBaseDomain } from '@/lib/subdomain';

const BASE_DOMAIN = getBaseDomain();
const USE_SUBDOMAINS = process.env.NEXT_PUBLIC_USE_SUBDOMAINS === 'true';

const PUBLIC_FILE = /\.(.*)$/;
const API_PREFIX = '/api';
const MEDIA_PROXY_PREFIX = '/media-proxy';
const STATIC_PREFIXES = ['/_next', '/favicon.ico', '/robots.txt', '/sitemap'];
const APP_PREFIX = '/dashboard'; // The main app prefix for the dashboard and creator pages. All other routes are considered public-facing.

// Playlist links are resolved by Next.js route matching, never as stream routes.
const PLAYLIST_SEGMENTS = ['playlist', 'playlists'];

function isStaticAsset(pathname: string): boolean {
  return STATIC_PREFIXES.some(prefix => pathname.startsWith(prefix)) || 
         PUBLIC_FILE.test(pathname);
}

function isPlaylistPath(pathname: string): boolean {
  return pathname.split('/').some(seg => PLAYLIST_SEGMENTS.includes(seg));
}

function normalizePlaylistPath(pathname: string): string {
  if (!isPlaylistPath(pathname)) return pathname;
  if (pathname.includes('/playlists/')) {
    return pathname.replace('/playlists/', '/playlist/');
  }
  return pathname;
}

function getHostname(request: NextRequest): string | null {
  return request.headers.get('x-forwarded-host') || 
         request.headers.get('host') || 
         null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = getHostname(request);
  
  if (!hostname) {
    return NextResponse.next();
  }

  const cleanHostname = hostname.replace(/^www\./, '').split(':')[0];
  const baseDomain = BASE_DOMAIN.replace(/^www\./, '');

  if (pathname.startsWith(API_PREFIX)) {
    return NextResponse.next();
  }

  if (pathname.startsWith(MEDIA_PROXY_PREFIX)) {
    return NextResponse.next();
  }

  if (pathname.startsWith(APP_PREFIX)) {
    return NextResponse.next();
  }

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // Playlist links must never be resolved as stream routes.
  if (isPlaylistPath(pathname)) {
    // Normalize legacy /playlists/ links to the canonical /playlist/ route.
    const normalized = normalizePlaylistPath(pathname);
    if (normalized !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = normalized;
      return NextResponse.redirect(url, 308);
    }
    // Base domain: let Next.js route /{company}/playlist/{id} normally.
    if (cleanHostname === baseDomain || cleanHostname === `www.${baseDomain}`) {
      return NextResponse.next();
    }
    // Subdomain: prepend the company prefix so the page resolves correctly.
    if (USE_SUBDOMAINS) {
      const subdomain = parseSubdomain(hostname);
      if (subdomain && isValidCompanySlug(subdomain)) {
        const url = request.nextUrl.clone();
        url.pathname = `/${subdomain}${pathname}`;
        return NextResponse.rewrite(url);
      }
      // Unknown subdomain: keep the original behavior and never resolve as a stream.
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (cleanHostname === baseDomain || cleanHostname === `www.${baseDomain}`) {
    if (pathname === '/' || pathname === '') {
      return NextResponse.next();
    }
    
    const firstSegment = pathname.split('/')[1];
    if (firstSegment && isValidCompanySlug(firstSegment)) {
      return NextResponse.next();
    }
    
    return NextResponse.next();
  }

  if (USE_SUBDOMAINS) {
    const subdomain = parseSubdomain(hostname);
    
    if (subdomain && isValidCompanySlug(subdomain)) {
      if (pathname === '/' || pathname === '') {
        const url = request.nextUrl.clone();
        url.pathname = `/${subdomain}`;
        return NextResponse.rewrite(url);
      }
      
      const url = request.nextUrl.clone();
      url.pathname = `/${subdomain}${pathname}`;
      return NextResponse.rewrite(url);
    }
    
    if (subdomain) {
      const firstPathSegment = pathname.split('/')[1];
      if (firstPathSegment && isValidCompanySlug(firstPathSegment)) {
        return NextResponse.next();
      }
      
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
};
