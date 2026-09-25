"use client";

import { useState } from "react";
import { AlertCircle, Link2, Loader2, RotateCcw, Sigma } from "lucide-react";

import ActionButtons from "@/components/ActionButtons";
import CandidateInfo from "@/components/CandidateInfo";
import ExamSelector from "@/components/ExamSelector";
import FileDropzone from "@/components/FileDropzone";
import ResultTable from "@/components/ResultTable";
import ScoreTile from "@/components/ScoreTile";
import { DEFAULT_EXAM_ID } from "@/lib/exams";
import { parseSheetHtml } from "@/lib/htmlParser";
import { useResult } from "@/lib/result-context";
import type { AnalysisResult } from "@/lib/types";

type Status = "idle" | "loading" | "error";

export default function Analyzer() {
  const { result, setResult, clear } = useResult();
  const [examId, setExamId] = useState<string>(DEFAULT_EXAM_ID);
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const busy = status === "loading";

  async function run(html: string) {
    const parsed: AnalysisResult = parseSheetHtml(html);
    if (parsed.questions.length === 0) {
      throw new Error(
        "No question panels were found. Make sure this is a saved response sheet page, not a login or results page.",
      );
    }
    setResult(parsed);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setDetail(null);

    if (!file && !url.trim()) {
      setError("Drop a response sheet file or paste a response sheet URL.");
      return;
    }

    setStatus("loading");
    try {
      if (file) {
        await run(await file.text());
      } else {
        const response = await fetch(
          `/api/fetch-sheet?url=${encodeURIComponent(url.trim())}`,
        );
        const payload = (await response.json()) as {
          html?: string;
          error?: string;
          detail?: string;
        };
        if (!response.ok || !payload.html) {
          if (payload.detail) setDetail(payload.detail);
          throw new Error(
            payload.error ?? `Could not fetch that URL (${response.status}).`,
          );
        }
        await run(payload.html);
      }
      setStatus("idle");
    } catch (caught) {
      setStatus("error");
      setError(
        caught instanceof Error ? caught.message : "Something went wrong while parsing.",
      );
    }
  }

  function handleReset() {
    setFile(null);
    setUrl("");
    setError(null);
    setDetail(null);
    setStatus("idle");
    clear();
  }

  const inputClass =
    "w-full rounded-lg border border-[#222f47] bg-[#0f1523] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-colors focus:border-blue-500 disabled:opacity-60";

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-[#222f47] bg-[#0b0f19]/95 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                <Sigma className="h-4 w-4 text-blue-400" aria-hidden />
              </span>
              <div>
                <h1 className="text-sm font-semibold text-slate-50">
                  Response Sheet Analyzer
                </h1>
                <p className="text-xs text-slate-500">TCS iON &amp; Digialm sheets</p>
              </div>
            </div>
            {result ? (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#222f47] px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-[#3b4a68] hover:text-slate-200"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                New sheet
              </button>
            ) : null}
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-4 grid gap-3 lg:grid-cols-[200px_1fr_auto] lg:items-end"
          >
            <ExamSelector
              value={examId}
              onChange={setExamId}
              detected={result?.detectedScheme ?? null}
              disabled={busy}
            />

            <div className="flex flex-col gap-2">
              <label
                htmlFor="sheet-url"
                className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-slate-400 uppercase"
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden />
                Response Sheet URL
              </label>
              <input
                id="sheet-url"
                type="url"
                inputMode="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                disabled={busy || Boolean(file)}
                placeholder="https://rrb.digialm.com/.../response-sheet.html"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-[42px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Fetching…
                </>
              ) : (
                "Calculate Marks"
              )}
            </button>

            <div className="lg:col-span-3">
              <FileDropzone
                onFile={(next) => {
                  setFile(next);
                  setUrl("");
                  setError(null);
                }}
                onClear={() => {
                  setFile(null);
                  setError(null);
                }}
                fileName={file?.name ?? null}
                disabled={busy}
              />
            </div>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {error ? (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm text-red-200">{error}</p>
              {detail ? (
                <p className="mt-1 break-words font-mono text-xs text-red-300/70">
                  {detail}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-slate-400">
                The exam portal may be blocking this server. You can still save the
                response sheet from your browser and drop the{" "}
                <span className="font-mono text-slate-300">.html</span> file above — that
                path never touches the network.
              </p>
            </div>
          </div>
        ) : null}

        {result ? (
          <div className="flex flex-col gap-5">
            {result.warnings.length > 0 ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
                <p className="text-xs font-semibold tracking-wide text-amber-400 uppercase">
                  Parsing notes
                </p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-amber-200/80">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <ScoreTile totals={result.totals} />

            <CandidateInfo
              candidate={result.candidate}
              examName={result.examName}
              scheme={result.detectedScheme}
            />

            <ResultTable sections={result.sections} grandTotal={result.totals.marks} />

            <ActionButtons />
          </div>
        ) : (
          !error && (
            <div className="rounded-xl border border-dashed border-[#222f47] bg-[#151c2c] px-6 py-16 text-center">
              <Sigma className="mx-auto h-8 w-8 text-slate-600" aria-hidden />
              <h2 className="mt-3 text-sm font-semibold text-slate-300">
                No response sheet loaded
              </h2>
              <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
                Drop a saved response sheet <span className="font-mono">.html</span>{" "}
                file above, or paste its URL, then press Calculate Marks.
              </p>
            </div>
          )
        )}
      </main>

      <footer className="border-t border-[#222f47] px-4 py-4">
        <p className="mx-auto max-w-6xl text-center text-xs text-slate-600">
          Parsing happens in your browser. Nothing is uploaded or stored on a server.
        </p>
      </footer>
    </>
  );
}
