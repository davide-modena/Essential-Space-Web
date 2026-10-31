interface Env {}

const ALLOWED_HOSTS = new Set([
  'essential-space.nothingtech.link',
  'account-c2-api.nothingtech.link',
  'firebasestorage.googleapis.com',
  'identitytoolkit.googleapis.com',
  // Signed URLs for capture images (needed to copy them to the clipboard)
  'storage.googleapis.com',
]);

function isAllowedHost(hostname: string): boolean {
  return ALLOWED_HOSTS.has(hostname) || hostname.endsWith('.storage.googleapis.com');
}

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, timestamp, auth, X-Trace-Id, X-Target-Url, Accept',
  'Access-Control-Max-Age': '86400',
};

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

/** Rejects requests made by other websites (only our own pages may call this). */
function isCrossSite(req: Request): boolean {
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return true;
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin) return true;
  return false;
}

export const onRequest = async (context: { request: Request; env: Env }): Promise<Response> => {
  const req = context.request;
  if (isCrossSite(req)) {
    return new Response(JSON.stringify({ error: 'Cross-site requests are not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url') || req.headers.get('x-target-url');

  if (!targetUrl) {
    return new Response(
      JSON.stringify({ error: 'Missing target URL (?url= or X-Target-Url)' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid target URL' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  if (!isAllowedHost(parsedUrl.hostname)) {
    return new Response(
      JSON.stringify({ error: `Forbidden host: ${parsedUrl.hostname}` }),
      { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  // Forward specific headers
  const forwardHeaders = new Headers();
  const allowedHeaders = [
    'authorization',
    'content-type',
    'timestamp',
    'auth',
    'x-trace-id',
    'accept',
  ];

  for (const h of allowedHeaders) {
    const val = req.headers.get(h);
    if (val) forwardHeaders.set(h, val);
  }

  let body: BodyInit | null = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.arrayBuffer();
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
    });

    const responseBody = await upstreamRes.arrayBuffer();
    const responseHeaders = new Headers(CORS_HEADERS);
    const contentType = upstreamRes.headers.get('content-type');
    if (contentType) responseHeaders.set('content-type', contentType);

    return new Response(responseBody, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Upstream fetch failed' }),
      { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
};
