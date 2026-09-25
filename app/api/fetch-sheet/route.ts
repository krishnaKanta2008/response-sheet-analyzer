/**
 * Fetches a response sheet server-side.
 *
 * The exam portals sit behind Akamai and send no `access-control-allow-origin`,
 * so the browser cannot read them directly. This route acts as a narrow proxy:
 * only exam hosts are allowed, the response must look like HTML, and it is
 * size- and time-capped.
 *
 * The origin also rejects non-browser clients. Akamai's bot manager scores the
 * TLS fingerprint and header set, and a bare server-side `fetch` is enough to
 * earn a 400. So requests are made with a full browser header profile, and the
 * upstream body is echoed back on failure to make the reason diagnosable.
 *
 * Request URLs are never logged, because they embed the candidate's roll number.
 */

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
 * Akamai fingerprints clients on header *consistency*, not just header presence,
 * so this mirrors a real Chrome navigation. `Accept-Encoding` deliberately
 * omits `br`: undici cannot decode brotli, and asking for it would hand us an
 * unreadable body.
 */
const BROWSER_HEADERS: Record<string, string> = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate",
  "Cache-Control": "max-age=0",
  Connection: "keep-alive",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
};

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

function fail(message: string, status: number, detail?: string): Response {
  return Response.json({ error: message, ...(detail ? { detail } : {}) }, { status });
}

/** Reduces an upstream error page to a short, readable fragment. */
function summarise(body: string): string | undefined {
  const text = body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return undefined;
  return text.slice(0, 300);
}

export async function GET(request: Request): Promise<Response> {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) return fail("Provide a url query parameter.", 400);

  let target: URL;
  try {
    target = new URL(raw.trim());
  } catch {
    return fail("That does not look like a valid URL.", 400);
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return fail("Only http and https URLs are supported.", 400);
  }
  if (!isAllowedHost(target.hostname)) {
    return fail(
      `Host not allowed. Supported exam hosts: ${ALLOWED_HOST_SUFFIXES.join(", ")}.`,
      403,
    );
  }

  // Some portals emit `//path` after the host, which Akamai is known to dislike.
  target = new URL(target.href.replace(/^(https?:\/\/[^/]+)\/\/+/, "$1/"));

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { ...BROWSER_HEADERS, Referer: `${target.origin}/` },
      cache: "no-store",
    });
  } catch (caught) {
    const reason =
      caught instanceof Error && caught.name === "TimeoutError"
        ? "timed out"
        : "could not be reached";
    return fail(`The response sheet ${reason}.`, 502);
  }

  // Redirects are followed, so re-check the host we actually landed on.
  if (!isAllowedHost(new URL(upstream.url).hostname)) {
    return fail("That URL redirects off an exam host.", 403);
  }

  if (!upstream.ok) {
    const detail = summarise(await upstream.text().catch(() => ""));
    return fail(
      `The exam server responded with ${upstream.status}.`,
      502,
      detail ? `${upstream.status} ${upstream.statusText}: ${detail}` : undefined,
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (contentType && !ALLOWED_CONTENT_TYPES.some((type) => contentType.includes(type))) {
    return fail(`Expected an HTML page but received ${contentType}.`, 415);
  }

  const declaredLength = Number(upstream.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_BYTES) {
    return fail("That page is too large to be a response sheet.", 413);
  }

  const html = await upstream.text();
  if (html.length > MAX_BYTES) {
    return fail("That page is too large to be a response sheet.", 413);
  }

  if (!/class="(?:rightAns|question-pnl)"/.test(html)) {
    return fail(
      "That page was fetched but does not look like a response sheet.",
      422,
    );
  }

  return Response.json({ html }, { headers: { "cache-control": "no-store" } });
}
