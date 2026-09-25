/**
 * Fetches a response sheet server-side.
 *
 * The exam portals do not send CORS headers, so the browser cannot read them
 * directly. This route acts as a narrow proxy: only exam hosts are allowed, the
 * response must look like HTML, and it is size- and time-capped.
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
const TIMEOUT_MS = 15_000;

const ALLOWED_CONTENT_TYPES = [
  "text/html",
  "application/xhtml+xml",
  "text/plain",
  "application/octet-stream",
];

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

function fail(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request): Promise<Response> {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) return fail("Provide a url query parameter.", 400);

  let target: URL;
  try {
    target = new URL(raw);
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

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "text/html,application/xhtml+xml" },
      cache: "no-store",
    });
  } catch (caught) {
    const reason =
      caught instanceof Error && caught.name === "TimeoutError"
        ? "timed out"
        : "could not be reached";
    return fail(`The response sheet ${reason}.`, 502);
  }

  if (!upstream.ok) {
    return fail(`The server responded with ${upstream.status}.`, 502);
  }

  // Redirects are followed, so re-check the host we actually landed on.
  if (!isAllowedHost(new URL(upstream.url).hostname)) {
    return fail("That URL redirects off an exam host.", 403);
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

  return Response.json(
    { html },
    { headers: { "cache-control": "no-store" } },
  );
}
