"use client";

import Link from "next/link";
import { ArrowLeft, Sigma } from "lucide-react";

import { useResult } from "@/lib/result-context";
import type { AnalysisResult } from "@/lib/types";

interface ResultShellProps {
  title: string;
  subtitle: string;
  children: (result: AnalysisResult) => React.ReactNode;
}

export default function ResultShell({
  title,
  subtitle,
  children,
}: ResultShellProps) {
  const { result } = useResult();

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-[#222f47] bg-[#0b0f19]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#222f47] text-slate-400 transition-colors hover:border-[#3b4a68] hover:text-slate-100"
              aria-label="Back to analyzer"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-slate-50">{title}</h1>
              <p className="truncate text-xs text-slate-500">
                {result ? `${result.examName} · ${subtitle}` : subtitle}
              </p>
            </div>
          </div>
          {result ? (
            <div className="hidden shrink-0 items-center gap-4 sm:flex">
              <div className="text-right">
                <p className="text-[10px] tracking-wide text-slate-500 uppercase">Marks</p>
                <p className="font-mono text-sm font-semibold text-slate-100">
                  {result.totals.marks.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] tracking-wide text-slate-500 uppercase">Accuracy</p>
                <p className="font-mono text-sm font-semibold text-slate-100">
                  {result.totals.accuracy.toFixed(1)}%
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {result ? (
          children(result)
        ) : (
          <div className="rounded-xl border border-dashed border-[#222f47] bg-[#151c2c] px-6 py-16 text-center">
            <Sigma className="mx-auto h-8 w-8 text-slate-600" aria-hidden />
            <h2 className="mt-3 text-sm font-semibold text-slate-300">
              No response sheet loaded
            </h2>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
              Load a response sheet on the analyzer page first, then come back here.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Go to analyzer
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
