#!/usr/bin/env node
/**
 * Standalone response sheet proxy.
 *
 * The exam portals (tcs iON / Digialm) sit behind Akamai and send no CORS
 * headers, so a browser cannot read them. They also block datacenter IP
 * ranges, so not every host is allowed to fetch them either — Vercel runs on
 * AWS EC2 and gets a 400.
 *
 * This server is a single dependency-free file so it can be run anywhere that
 * is not blocked: a VPS, a home machine with a tunnel, Fly.io, Render,
 * Railway, Deno Deploy, and so on.
 *
 *   node scripts/proxy-server.mjs            # listens on :8787
 *   PORT=9000 node scripts/proxy-server.mjs
 *
 * Then point the app at it:
 *   NEXT_PUBLIC_SHEET_PROXY_URL=http://localhost:8787 npm run dev
 *
 * The guard rails match app/api/fetch-sheet/route.ts exactly: an exam-host
 * allowlist, a re-check after redirects, an HTML content-type check, and
 * size/time caps. Request URLs are never logged, because they embed the
 * candidate's roll number.
 */

import { createServer } from "node:http";

const ALLOWED_HOST_SUFFIXES = [
  "digialm.com",
  "tcsion.com",
  "tcs.com",
  "nta.ac.in",
  "nta.nic.in",
];

const MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 20_000;

const ALLOWED_CONTENT_TYPES = [
  "text/html",
  "application/xhtml+xml",
  "text/plain",
  "application/octet-stream",
];

/**
 * Akamai scores clients on header consistency as well as header presence, so
 * this mirrors a real Chrome navigation. `Accept-Encoding` omits `br` on
 * purpose: Node's fetch cannot decode brotli and would hand back garbage.
 */
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

const PORT = Number(process.env.PORT ?? 8787);
/** Set to a specific origin to restrict browser access, e.g. https://my.app */
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "*";

function isAllowedHost(hostname) {
  const host = hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
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

function corsHeaders() {
  return {
    "access-control-allow-origin": ALLOWED_ORIGIN,
    "access-control-allow-methods": "GET, OPTIONS",
    "cache-control": "no-store",
  };
}

function sendJson(res, body, status) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    ...corsHeaders(),
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(text),
  });
  res.end(text);
}

async function handle(req, res) {
  const requestUrl = new URL(req.url, `http://localhost:${PORT}`);

  if (requestUrl.pathname === "/health") {
    return sendJson(res, { ok: true, allowedHosts: ALLOWED_HOST_SUFFIXES }, 200);
  }

  if (requestUrl.searchParams.has("url")) {
    return proxy(requestUrl.searchParams.get("url"), res);
  }

  return sendJson(
    res,
    { error: 'Pass the sheet as a query parameter, e.g. /?url=https://...' },
    400,
  );
}

async function proxy(rawUrl, res) {
  if (!rawUrl) return sendJson(res, { error: "Missing url parameter." }, 400);

  let target;
  try {
    target = new URL(rawUrl.trim());
  } catch {
    return sendJson(res, { error: "That is not a valid URL." }, 400);
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return sendJson(res, { error: "Only http and https are supported." }, 400);
  }
  if (!isAllowedHost(target.hostname)) {
    return sendJson(
      res,
      {
        error: `Host not allowed. Supported exam hosts: ${ALLOWED_HOST_SUFFIXES.join(", ")}.`,
      },
      403,
    );
  }

  // These URLs contain `//path`, which Akamai is known to dislike.
  target = new URL(target.href.replace(/^(https?:\/\/[^/]+)\/\/+/, "$1/"));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let upstream;
  try {
    upstream = await fetch(target, {
      headers: { ...BROWSER_HEADERS, Referer: `${target.origin}/` },
      redirect: "follow",
      signal: controller.signal,
    });
  } catch (caught) {
    const aborted = caught instanceof Error && caught.name === "AbortError";
    return sendJson(
      res,
      { error: `The response sheet ${aborted ? "timed out" : "could not be reached"}.` },
      502,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!isAllowedHost(new URL(upstream.url).hostname)) {
    return sendJson(res, { error: "That URL redirects off an exam host." }, 403);
  }

  if (!upstream.ok) {
    const detail = summarise(await upstream.text().catch(() => ""));
    return sendJson(
      res,
      { error: `The exam server responded with ${upstream.status}.`, detail },
      502,
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (contentType && !ALLOWED_CONTENT_TYPES.some((t) => contentType.includes(t))) {
    return sendJson(
      res,
      { error: `Expected an HTML page but received ${contentType}.` },
      415,
    );
  }

  const declared = Number(upstream.headers.get("content-length") ?? "0");
  if (declared > MAX_BYTES) {
    return sendJson(res, { error: "That page is too large to be a response sheet." }, 413);
  }

  const html = await upstream.text();
  if (html.length > MAX_BYTES) {
    return sendJson(res, { error: "That page is too large to be a response sheet." }, 413);
  }
  if (!/class="(?:rightAns|question-pnl)"/.test(html)) {
    return sendJson(
      res,
      { error: "That page was fetched but does not look like a response sheet." },
      422,
    );
  }

  return sendJson(res, { html }, 200);
}

const server = createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    return res.end();
  }
  if (req.method !== "GET") {
    return sendJson(res, { error: "Method not allowed." }, 405);
  }
  handle(req, res).catch((error) =>
    sendJson(res, { error: "Proxy failed.", detail: String(error?.message ?? error) }, 500),
  );
});

server.listen(PORT, () => {
  console.log(`Response sheet proxy listening on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Allowed hosts: ${ALLOWED_HOST_SUFFIXES.join(", ")}`);
  if (ALLOWED_ORIGIN !== "*") {
    console.log(`CORS restricted to: ${ALLOWED_ORIGIN}`);
  }
});
