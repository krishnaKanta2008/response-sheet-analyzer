# Response Sheet Analyzer

Parses TCS iON / Digialm exam response sheets and calculates section-wise marks,
accuracy and analytics. Runs entirely in the browser — the sheet is never stored
or uploaded anywhere.

![Next.js](https://img.shields.io/badge/Next.js-16-000) ![React](https://img.shields.io/badge/React-19-087ea4) ![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)

## Features

- **Two ways in** — drop a saved `.html` response sheet, or paste its URL. URLs
  are fetched through a locked-down proxy route (see below).
- **Automatic marking scheme** — the sheet states its own rules ("Correct Answer
  will carry 1 mark… Incorrect Answer will carry 1/3 Negative mark…"), so the
  scheme is read from the document rather than hardcoded.
- **Section-wise breakdown** — sections are taken from the sheet's own
  `.section-cntnr` structure, so no question counts are guessed.
- **Review** — every question with your pick against the correct answer,
  filterable by correct / wrong / skipped.
- **Mock re-attempt** — a fresh attempt scored live against the answer key.
- **Analytics** — per-section accuracy, answer-key spread, weakest section.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How to use it

**Save your response sheet as an `.html` file, then drop it in.** The in-app guide
has the same steps. In short, on a computer: open the response sheet while logged
in, press `Ctrl + S` (`Cmd + S` on Mac), choose **Webpage, HTML Only** (Chrome /
Edge) or **Webpage, HTML** (Firefox) or **Webpage, Single File** (Safari), then
drop the resulting file into the upload box and press Calculate Marks.

Phone browsers generally cannot save a page as a usable `.html` file — see the
mobile section of the in-app guide. Parsing happens entirely in the browser;
nothing is uploaded.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint over `app`, `components`, `lib`, `scripts` |
| `npm run verify:parse -- <sheet.html>` | Parse a saved sheet and assert the expected values |
| `npm run proxy` | Start the standalone fetch proxy on `:8787` |

## How parsing works

`lib/htmlParser.ts` runs on the client using the native `DOMParser`:

| Target | Selector |
| --- | --- |
| Candidate details | `.main-info-pnl` rows |
| Marking scheme | the `* Note` text block |
| Sections | `.grp-cntnr > .section-cntnr` → `.section-lbl` |
| Question panels | `.question-pnl` |
| Correct answer | the single `td.rightAns` (others are `td.wrngAns`) |
| Chosen answer / status | `.menu-tbl` rows |

The sheet is malformed in places — the "Chosen Option" row is missing its
opening `<tr>`, and the header labels carry no trailing colon — so cells are
read positionally rather than by row. The candidate's photograph is a ~260 KB
base64 data URI and is stripped before parsing.

## Why URL fetching needs a proxy — and sometimes more than one

The exam portals sit behind Akamai and send **no `access-control-allow-origin`**
(verified against four Origin/preflight variants), so a browser cannot read them
directly. Some server-side egress is required.

The catch is that the same WAF **blocks datacenter IP ranges**. A Vercel function
egresses from AWS EC2, and tcs iON answers it with:

```
400 Bad Request: 403 tcs iON 403 Sorry for the inconvenience...
Client IP Address 32.196.135.248   (ec2-32-196-135-248.compute-1.amazonaws.com)
```

No request header can fix an IP-reputation block. Note that **on localhost the
in-app route works fine** — the portal only rejects datacenter egress. It fails
on some hosted platforms because of where they run, not because of the code.

`lib/fetchSheet.ts` therefore tries each egress in turn and uses the first that
succeeds, with a 30 s timeout per attempt so a hanging source cannot stall the
rest:

1. Each URL in **`NEXT_PUBLIC_SHEET_PROXY_URL`** (comma-separated, tried in
   order)
2. **`/api/fetch-sheet`** — the in-app route, tried last because it is the one
   that works on localhost and on non-datacenter hosts

If everything fails, the error names each source it tried and why.

### Option A — the in-app route (default, no setup)

`/api/fetch-sheet` works out of the box on localhost and on any deployment that
is not on a blocked range. Nothing to configure.

### Option B — the standalone proxy, on any host

`scripts/proxy-server.mjs` is a single dependency-free file, so it can run
anywhere that is not blocked — a VPS, a home machine behind a tunnel, Fly.io,
Render, Railway, Deno Deploy:

```bash
npm run proxy                       # listens on :8787
PORT=9000 npm run proxy             # or pick a port
```

Locally, point the app at it:

```bash
NEXT_PUBLIC_SHEET_PROXY_URL=http://localhost:8787 npm run dev
```

A `GET /health` endpoint confirms it is up without touching the network.

### Option C — the Cloudflare Worker

```bash
cd worker
npx wrangler deploy
```

Then set `NEXT_PUBLIC_SHEET_PROXY_URL` in your Vercel project settings (and
redeploy) to the printed `https://response-sheet-proxy.<subdomain>.workers.dev`
URL. With no variable set, the app simply uses the in-app route.

All three proxies share identical guard rails:

- only `digialm.com`, `tcsion.com`, `tcs.com`, `nta.ac.in`, `nta.nic.in`
- re-checks the host after redirects
- requires an HTML-like content type, 20 s timeout, 8 MB cap
- rejects pages containing no question panels
- never logs the request URL, which embeds the candidate's roll number

**File upload is unaffected by all of this** and is the most reliable input: it
never makes a network request.

## The proxy route

`app/api/fetch-sheet` exists because the exam portals send no CORS headers, so
the browser cannot read them directly. It is deliberately narrow:

- only `digialm.com`, `tcsion.com`, `tcs.com`, `nta.ac.in`, `nta.nic.in`
- re-checks the host after redirects
- requires an HTML-like content type, 15 s timeout, 8 MB cap
- never logs the request URL, which embeds the candidate's roll number

Deploy it somewhere that does not permit outbound requests to internal
networks, or remove the route and use file upload only. See
[Why URL fetching needs a proxy](#why-url-fetching-needs-a-proxy--and-sometimes-two)
for why one proxy often is not enough.

## Verification

`scripts/verify-parse.mjs` compiles `lib/` to CommonJS in a scratch directory,
parses a saved sheet with jsdom, and asserts against known-good values. It
exits non-zero on any mismatch, so it works in CI.

```bash
npm run verify:parse -- path/to/sheet.html
```

## Scope

RRB marking (+1 / −⅓) is implemented and tested. `lib/exams.ts` is structured so
other schemes (JEE Main, SSC) and custom marking are small additions, but they
are not yet wired up or verified against real sheets.

## Disclaimer

Built for personal exam-prep review. You are responsible for complying with the
terms of any exam provider whose response sheets you parse.
