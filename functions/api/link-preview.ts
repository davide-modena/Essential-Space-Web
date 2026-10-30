interface Env {}

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Max-Age': '86400',
};

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

function resolveUrl(relativeOrAbsolute: string, baseUrl: string): string {
  try {
    return new URL(relativeOrAbsolute, baseUrl).href;
  } catch {
    return relativeOrAbsolute;
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractMeta(html: string, propertyOrNames: string[]): string | null {
  for (const name of propertyOrNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex1 = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["']`, 'i');
    const match1 = html.match(regex1);
    if (match1 && match1[1]) return decodeHtmlEntities(match1[1].trim());

    const regex2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i');
    const match2 = html.match(regex2);
    if (match2 && match2[1]) return decodeHtmlEntities(match2[1].trim());
  }
  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match && match[1] ? decodeHtmlEntities(match[1].trim()) : null;
}

function extractFavicon(html: string, baseUrl: string): string {
  const match = html.match(/<link[^>]+(?:rel=["'](?:shortcut icon|icon|apple-touch-icon)["'])[^>]+href=["']([^"']*)["']/i) ||
                html.match(/<link[^>]+href=["']([^"']*)["'][^>]+(?:rel=["'](?:shortcut icon|icon|apple-touch-icon)["'])/i);
  if (match && match[1]) {
    return resolveUrl(match[1].trim(), baseUrl);
  }
  try {
    const u = new URL(baseUrl);
    return `${u.origin}/favicon.ico`;
  } catch {
    return '';
  }
}

/** Blocks non-web schemes, odd ports and internal/private hosts (SSRF). */
function isBlockedTarget(u: URL): boolean {
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return true;
  if (u.port && u.port !== '80' && u.port !== '443') return true;
  if (u.username || u.password) return true;
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    !host.includes('.') && !host.includes(':')
  ) {
    return true;
  }
  // IPv4 literals in private, loopback, link-local or reserved ranges
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    ) {
      return true;
    }
  }
  // IPv6 literals: block loopback, unique-local, link-local, mapped
  if (host.includes(':')) {
    if (host === '::1' || host === '::' || /^f[cd]/.test(host) || /^fe[89ab]/.test(host) || host.startsWith('::ffff:')) {
      return true;
    }
  }
  return false;
}

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
  let targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing target URL (?url=)' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Auto-prepend https:// if protocol is missing
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  let parsedTarget: URL;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid target URL' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  if (isBlockedTarget(parsedTarget)) {
    return new Response(JSON.stringify({ error: 'Forbidden target URL' }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const domain = parsedTarget.hostname.replace(/^www\./, '');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (compatible; NothingSpaceBot/1.0)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'uk,en-US;q=0.9,en;q=0.8',
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Upstream returned HTTP ${res.status}`);
    }

    // Read only first ~256KB of HTML to keep response fast
    const reader = res.body?.getReader();
    let html = '';
    if (reader) {
      const decoder = new TextDecoder();
      let bytesRead = 0;
      while (bytesRead < 262144) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        bytesRead += value.length;
        html += decoder.decode(value, { stream: true });
        if (html.includes('</head>')) break;
      }
      reader.cancel();
    } else {
      html = await res.text();
    }

    const title =
      extractMeta(html, ['og:title', 'twitter:title']) ||
      extractTitle(html) ||
      domain;

    const description =
      extractMeta(html, ['og:description', 'twitter:description', 'description']) ||
      '';

    const rawPreview =
      extractMeta(html, ['og:image', 'twitter:image', 'twitter:image:src', 'image']);
    const preview = rawPreview ? resolveUrl(rawPreview, targetUrl) : undefined;

    const siteName =
      extractMeta(html, ['og:site_name', 'twitter:site']) ||
      domain;

    let favicon = extractFavicon(html, targetUrl);
    if (!favicon) {
      favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    }

    const result = {
      url: targetUrl,
      title,
      description,
      preview,
      favicon,
      domain,
      siteName,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    // Fallback response with basic domain & Google favicon
    const fallback = {
      url: targetUrl,
      title: domain,
      description: targetUrl,
      preview: undefined,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      domain,
      siteName: domain,
    };

    return new Response(JSON.stringify(fallback), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    });
  }
};
