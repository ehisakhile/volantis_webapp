export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STREAM_PASSTHROUGH_HEADERS = [
  'content-type',
  'content-length',
  'content-range',
  'accept-ranges',
  'etag',
  'last-modified',
];

function isAllowedMediaHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'volantislive.com' || h.endsWith('.volantislive.com')) return true;
  if (h.endsWith('.cloudfront.net')) return true;
  if (/\.s3([.-][a-z0-9-]+)?\.amazonaws\.com$/i.test(h)) return true;
  return false;
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  if (!url) return new Response('Missing url parameter', { status: 400 });

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return new Response('Invalid url parameter', { status: 400 });
  }

  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return new Response('Invalid url protocol', { status: 400 });
  }

  if (!isAllowedMediaHost(target.hostname)) {
    return new Response('Disallowed media host', { status: 403 });
  }

  const headers: HeadersInit = {};
  const range = request.headers.get('range');
  if (range) {
    headers.Range = range;
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), { headers, cache: 'no-store' });
  } catch {
    return new Response('Failed to reach media source', { status: 502 });
  }

  const responseHeaders = new Headers();
  for (const name of STREAM_PASSTHROUGH_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) {
      responseHeaders.set(name, value);
    }
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
