import { Target, Trophy } from "lucide-react";

import type { AnalysisTotals } from "@/lib/types";

interface ScoreTileProps {
  totals: AnalysisTotals;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-[#222f47] bg-[#0f1523] px-4 py-3">
      <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
        {label}
      </p>
      <p className={`mt-1 font-mono text-xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

export default function ScoreTile({ totals }: ScoreTileProps) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="col-span-2 flex items-center gap-4 rounded-xl border border-[#222f47] bg-[#151c2c] px-5 py-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
          <Trophy className="h-6 w-6 text-blue-400" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            Total Marks
          </p>
          <p className="font-mono text-3xl font-bold text-slate-50">
            {totals.marks.toFixed(2)}
            <span className="ml-2 text-sm font-normal text-slate-500">
              / {totals.maxMarks.toFixed(2)}
            </span>
          </p>
        </div>
      </div>

      <Stat label="Correct" value={String(totals.right)} tone="text-green-500" />
      <Stat
        label="Accuracy"
        value={`${totals.accuracy.toFixed(1)}%`}
        tone="text-slate-100"
      />

      <Stat label="Wrong" value={String(totals.wrong)} tone="text-red-500" />
      <Stat
        label="Skipped"
        value={String(totals.unattempted)}
        tone="text-slate-400"
      />
      <Stat
        label="Score"
        value={`${totals.scorePercent.toFixed(1)}%`}
        tone="text-slate-100"
      />
      <div className="col-span-2 flex items-center gap-2 rounded-lg border border-[#222f47] bg-[#0f1523] px-4 py-3 lg:col-span-1">
        <Target className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        <p className="text-xs text-slate-400">
          Attempted{" "}
          <span className="font-mono text-slate-200">
            {totals.right + totals.wrong}
          </span>{" "}
          of {totals.total}
        </p>
      </div>
    </section>
  );
}
