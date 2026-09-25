"use client";

import { useState } from "react";
import { CheckCircle2, CircleX, MinusCircle } from "lucide-react";

import ResultShell from "@/components/ResultShell";
import { ResultProvider } from "@/lib/result-context";
import { outcomeOf } from "@/lib/scoring";
import type { QuestionOutcome } from "@/lib/scoring";
import type { AnalysisResult, ParsedQuestion } from "@/lib/types";

type Filter = "all" | QuestionOutcome;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "right", label: "Correct" },
  { id: "wrong", label: "Wrong" },
  { id: "unattempted", label: "Skipped" },
];

const OUTCOME_STYLE: Record<QuestionOutcome, { icon: typeof CheckCircle2; className: string; label: string }> = {
  right: { icon: CheckCircle2, className: "text-green-500", label: "Correct" },
  wrong: { icon: CircleX, className: "text-red-500", label: "Wrong" },
  unattempted: { icon: MinusCircle, className: "text-slate-500", label: "Skipped" },
};

function QuestionCard({ question }: { question: ParsedQuestion }) {
  const outcome = outcomeOf(question);
  const { icon: Icon, className, label } = OUTCOME_STYLE[outcome];

  return (
    <article className="rounded-xl border border-[#222f47] bg-[#151c2c]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222f47] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-sm font-semibold text-slate-200">
            Q.{question.number}
          </span>
          <span className="rounded-full bg-[#0f1523] px-2.5 py-0.5 text-[11px] text-slate-400">
            {question.section}
          </span>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${className}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {label}
        </span>
      </header>

      <p className="px-4 py-3 text-sm leading-relaxed text-slate-200">
        {question.text || <span className="text-slate-600">Question text unavailable.</span>}
      </p>

      <ul className="border-t border-[#222f47]">
        {question.options.map((option) => {
          const isChosen = option.letter === question.chosenLetter;
          return (
            <li
              key={option.letter}
              className={`flex items-start gap-3 border-b border-[#1a2233] px-4 py-2.5 text-sm last:border-b-0 ${
                option.isCorrect ? "text-green-400" : "text-slate-400"
              }`}
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[#2c3a55] font-mono text-[11px] text-slate-400">
                {option.letter}
              </span>
              <span className="flex-1">{option.text}</span>
              <span className="flex shrink-0 gap-1.5">
                {option.isCorrect ? (
                  <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-green-400 uppercase">
                    Correct
                  </span>
                ) : null}
                {isChosen ? (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                      option.isCorrect
                        ? "bg-green-500/10 text-green-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    Your pick
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function ReviewView() {
  const [filter, setFilter] = useState<Filter>("all");

  return (
    <ResultShell title="Review Paper" subtitle="Every question with your pick">
      {(result: AnalysisResult) => {
        const tally = result.questions.reduce(
          (acc, question) => {
            acc.all += 1;
            acc[outcomeOf(question)] += 1;
            return acc;
          },
          { all: 0, right: 0, wrong: 0, unattempted: 0 },
        );
        const visible = result.questions.filter(
          (question) => filter === "all" || outcomeOf(question) === filter,
        );

        return (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                    filter === id
                      ? "border-blue-500 bg-blue-500/10 text-blue-300"
                      : "border-[#222f47] text-slate-400 hover:border-[#3b4a68] hover:text-slate-200"
                  }`}
                >
                  {label}
                  <span className="ml-1.5 font-mono text-slate-500">{tally[id]}</span>
                </button>
              ))}
            </div>

            {visible.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#222f47] px-6 py-12 text-center text-sm text-slate-500">
                No questions in this category.
              </p>
            ) : (
              visible.map((question) => (
                <QuestionCard key={question.number} question={question} />
              ))
            )}
          </div>
        );
      }}
    </ResultShell>
  );
}

export default function ReviewPage() {
  return (
    <ResultProvider>
      <ReviewView />
    </ResultProvider>
  );
}
