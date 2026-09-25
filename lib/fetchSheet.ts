/**
 * Fetches a response sheet HTML through whichever proxies are available.
 *
 * The exam portals sit behind a WAF that blocks datacenter IP ranges, and no
 * single provider is reliably permitted, so the request is tried against each
 * egress in turn. The first success wins; every attempt's error is kept so a
 * total failure can explain what was actually tried.
 *
 * Order matters: the Cloudflare Worker egress is tried first because the
 * Next.js route runs on AWS EC2, which tcs iON is known to reject.
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

function proxyTargets(sheetUrl: string): Array<{ label: string; endpoint: string }> {
  const query = `?url=${encodeURIComponent(sheetUrl)}`;
  const targets: Array<{ label: string; endpoint: string }> = [];

  const worker = process.env.NEXT_PUBLIC_SHEET_PROXY_URL;
  if (worker) {
    targets.push({
      label: "Cloudflare Worker",
      endpoint: `${worker.replace(/\/$/, "")}${query}`,
    });
  }
  targets.push({ label: "app server", endpoint: `/api/fetch-sheet${query}` });
  return targets;
}

export async function fetchSheetHtml(sheetUrl: string): Promise<string> {
  const failures: FetchFailure[] = [];

  for (const { label, endpoint } of proxyTargets(sheetUrl)) {
    try {
      const response = await fetch(endpoint);
      let payload: ProxyResponse;
      try {
        payload = (await response.json()) as ProxyResponse;
      } catch {
        throw new Error(`unexpected response (${response.status})`);
      }

      if (response.ok && payload.html) return payload.html;

      const message = payload.error ?? `request failed (${response.status})`;
      failures.push({ source: label, message, detail: payload.detail });
    } catch (caught) {
      failures.push({
        source: label,
        message: caught instanceof Error ? caught.message : "unreachable",
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
