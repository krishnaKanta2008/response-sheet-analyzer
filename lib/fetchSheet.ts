/**
 * Fetches a response sheet HTML through whichever proxies are available.
 *
 * The exam portals sit behind a WAF that blocks datacenter IP ranges, and no
 * single provider is reliably permitted, so the request is tried against each
 * egress in turn. The first success wins; every attempt's error is kept so a
 * total failure can explain what was actually tried.
 *
 * Order matters: externally hosted proxies are tried first, because the
 * Next.js route runs on AWS EC2, which tcs iON is known to reject. That route
 * stays last since it is the one that works on localhost and on any
 * non-datacenter deployment.
 *
 * Configure extra proxies with a comma-separated list:
 *   NEXT_PUBLIC_SHEET_PROXY_URL=https://a.workers.dev,http://localhost:8787
 */

export interface FetchFailure {
  source: string;
  message: string;
  detail?: string;
}

export class SheetFetchError extends Error {
  failures: FetchFailure[];

  constructor(message: string, failures: FetchFailure[]) {
    super(message);
    this.name = "SheetFetchError";
    this.failures = failures;
  }
}

interface ProxyResponse {
  html?: string;
  error?: string;
  detail?: string;
}

/** Generous enough for a 600 KB sheet on a cold serverless start. */
const TIMEOUT_MS = 30_000;

function labelFor(index: number, total: number): string {
  if (total === 1) return "configured proxy";
  return `proxy ${index + 1}`;
}

function proxyTargets(
  sheetUrl: string,
): Array<{ label: string; endpoint: string }> {
  const query = `?url=${encodeURIComponent(sheetUrl)}`;
  const targets: Array<{ label: string; endpoint: string }> = [];

  const configured = (process.env.NEXT_PUBLIC_SHEET_PROXY_URL ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  configured.forEach((base, index) => {
    targets.push({
      label: labelFor(index, configured.length),
      endpoint: `${base.replace(/\/$/, "")}${query}`,
    });
  });

  targets.push({ label: "app server", endpoint: `/api/fetch-sheet${query}` });
  return targets;
}

/** A hanging proxy must not stall the whole attempt. */
async function fetchWithTimeout(
  endpoint: string,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(endpoint, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSheetHtml(sheetUrl: string): Promise<string> {
  const failures: FetchFailure[] = [];

  for (const { label, endpoint } of proxyTargets(sheetUrl)) {
    try {
      const response = await fetchWithTimeout(endpoint);
      let payload: ProxyResponse;
      try {
        payload = (await response.json()) as ProxyResponse;
      } catch {
        throw new Error(`unexpected response (${response.status})`);
      }

      if (response.ok && payload.html) return payload.html;

      failures.push({
        source: label,
        message: payload.error ?? `request failed (${response.status})`,
        detail: payload.detail,
      });
    } catch (caught) {
      const aborted = caught instanceof Error && caught.name === "AbortError";
      failures.push({
        source: label,
        message: aborted ? "timed out" : "unreachable",
      });
    }
  }

  throw new SheetFetchError(
    failures.length === 1
      ? failures[0].message
      : `Could not fetch the sheet from any source. Tried: ${failures
          .map((failure) => failure.source)
          .join(", ")}.`,
    failures,
  );
}
