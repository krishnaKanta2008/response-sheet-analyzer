/**
 * Response sheet proxy — Cloudflare Worker.
 *
 * The exam portals (TCS iON / Digialm) sit behind Akamai and block datacenter
 * IP ranges. Vercel functions egress from AWS EC2, which they reject with a
 * 400, so this Worker exists to fetch from Cloudflare's network instead.
 *
 * The guard rails are deliberately identical to app/api/fetch-sheet/route.ts:
 * an exam-host allowlist, a re-check after redirects, an HTML content-type
 * check, and size/time caps.
 *
 * Deploy:
 *   cd worker && npx wrangler deploy
 * Then set NEXT_PUBLIC_SHEET_PROXY_URL to the deployed worker URL.
 */

const ALLOWED_HOST_SUFFIXES = [
  "digialm.com",
  "tcsion.com",
  "tcs.com",
  "nta.ac.in",
  "nta.nic.in",
];

const MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = [
  "text/html",
  "application/xhtml+xml",
  "text/plain",
  "application/octet-stream",
];

const BROWSER_HEADERS = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "max-age=0",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
};

function isAllowedHost(hostname) {
  const host = hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
  });
}

function summarise(body) {
  const text = body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, 300) : undefined;
}

export async function handle(request) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) return json({ error: "Provide a url query parameter." }, 400);

  let target;
  try {
    target = new URL(raw.trim());
  } catch {
    return json({ error: "That does not look like a valid URL." }, 400);
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return json({ error: "Only http and https URLs are supported." }, 400);
  }
  if (!isAllowedHost(target.hostname)) {
    return json(
      {
        error: `Host not allowed. Supported exam hosts: ${ALLOWED_HOST_SUFFIXES.join(", ")}.`,
      },
      403,
    );
  }

  target = new URL(target.href.replace(/^(https?:\/\/[^/]+)\/\/+/, "$1/"));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let upstream;
  try {
    upstream = await fetch(target.toString(), {
      headers: { ...BROWSER_HEADERS, Referer: `${target.origin}/` },
      redirect: "follow",
      signal: controller.signal,
    });
  } catch (caught) {
    const aborted = caught instanceof Error && caught.name === "AbortError";
    return json(
      { error: `The response sheet ${aborted ? "timed out" : "could not be reached"}.` },
      502,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!isAllowedHost(new URL(upstream.url).hostname)) {
    return json({ error: "That URL redirects off an exam host." }, 403);
  }

  if (!upstream.ok) {
    const detail = summarise(await upstream.text().catch(() => ""));
    return json(
      { error: `The exam server responded with ${upstream.status}.`, detail },
      502,
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (contentType && !ALLOWED_CONTENT_TYPES.some((t) => contentType.includes(t))) {
    return json({ error: `Expected an HTML page but received ${contentType}.` }, 415);
  }

  const declared = Number(upstream.headers.get("content-length") ?? "0");
  if (declared > MAX_BYTES) {
    return json({ error: "That page is too large to be a response sheet." }, 413);
  }

  const html = await upstream.text();
  if (html.length > MAX_BYTES) {
    return json({ error: "That page is too large to be a response sheet." }, 413);
  }
  if (!/class="(?:rightAns|question-pnl)"/.test(html)) {
    return json(
      { error: "That page was fetched but does not look like a response sheet." },
      422,
    );
  }

  return json({ html }, 200);
}

const worker = {
  // Cloudflare requires CORS handling for browser calls to the worker itself.
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-max-age": "86400",
        },
      });
    }
    if (request.method !== "GET") {
      return json({ error: "Method not allowed." }, 405);
    }
    return handle(request, env);
  },
};

export default worker;
