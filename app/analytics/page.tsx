"use client";

import ResultShell from "@/components/ResultShell";
import { ResultProvider } from "@/lib/result-context";
import { outcomeOf } from "@/lib/scoring";
import type { QuestionOutcome } from "@/lib/scoring";
import type { AnalysisResult } from "@/lib/types";

const OUTCOME_COLOR: Record<QuestionOutcome, string> = {
  right: "bg-green-500",
  wrong: "bg-red-500",
  unattempted: "bg-slate-600",
};

const OUTCOME_LABEL: Record<QuestionOutcome, string> = {
  right: "Correct",
  wrong: "Wrong",
  unattempted: "Skipped",
};

function StackedBar({ counts }: { counts: Record<QuestionOutcome, number> }) {
  const total = counts.right + counts.wrong + counts.unattempted;
  if (total === 0) return null;

  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#0f1523]">
      {(["right", "wrong", "unattempted"] as const).map((key) =>
        counts[key] === 0 ? null : (
          <div
            key={key}
            className={OUTCOME_COLOR[key]}
            style={{ width: `${(counts[key] / total) * 100}%` }}
            title={`${OUTCOME_LABEL[key]}: ${counts[key]}`}
          />
        ),
      )}
    </div>
  );
}

function AnalyticsView() {
  return (
    <ResultShell title="View Analytics" subtitle="Section-wise performance">
      {(result: AnalysisResult) => {
        const { totals, sections, questions, detectedScheme } = result;
        const attemptRate =
          totals.total > 0
            ? ((totals.right + totals.wrong) / totals.total) * 100
            : 0;

        const hardest = [...sections]
          .filter((section) => section.right + section.wrong > 0)
          .map((section) => ({
            name: section.name,
            accuracy:
              section.right + section.wrong > 0
                ? (section.right / (section.right + section.wrong)) * 100
                : 0,
          }))
          .sort((a, b) => a.accuracy - b.accuracy)[0];

        const questionNumbers = new Set(questions.map((question) => question.number));
        const correctLetters = questions.reduce<Record<string, number>>((acc, question) => {
          if (question.correctLetter) {
            acc[question.correctLetter] = (acc[question.correctLetter] ?? 0) + 1;
          }
          return acc;
        }, {});
        const hardestQuestion = questions
          .filter((question) => question.chosenLetter)
          .reduce<(typeof questions)[number] | null>(
            (worst, question) => {
              if (outcomeOf(question) !== "wrong") return worst;
              if (!worst) return question;
              return question.number > worst.number ? question : worst;
            },
            null,
          );

        return (
          <div className="flex flex-col gap-5">
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: "Score", value: `${totals.scorePercent.toFixed(1)}%`, tone: "text-slate-50" },
                { label: "Accuracy", value: `${totals.accuracy.toFixed(1)}%`, tone: "text-slate-50" },
                { label: "Attempt rate", value: `${attemptRate.toFixed(1)}%`, tone: "text-slate-50" },
                { label: "Questions", value: String(totals.total), tone: "text-slate-50" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-[#222f47] bg-[#151c2c] px-4 py-4"
                >
                  <p className="text-xs tracking-wide text-slate-400 uppercase">
                    {stat.label}
                  </p>
                  <p className={`mt-1 font-mono text-2xl font-bold ${stat.tone}`}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </section>

            <section className="rounded-xl border border-[#222f47] bg-[#151c2c]">
              <header className="border-b border-[#222f47] bg-[#1b2436] px-5 py-3">
                <h2 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
                  Section breakdown
                </h2>
              </header>
              <ul className="divide-y divide-[#1a2233]">
                {sections.map((section) => {
                  const attempted = section.right + section.wrong;
                  const accuracy = attempted
                    ? (section.right / attempted) * 100
                    : 0;
                  return (
                    <li key={section.name} className="px-5 py-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-slate-200">{section.name}</p>
                        <p className="font-mono text-xs text-slate-400">
                          <span className="text-green-500">{section.right}</span> /{" "}
                          <span className="text-red-500">{section.wrong}</span> /{" "}
                          <span className="text-slate-500">{section.unattempted}</span>
                          {" · "}
                          <span className="text-slate-200">
                            {section.marks.toFixed(2)} marks
                          </span>
                        </p>
                      </div>
                      <div className="mt-2.5">
                        <StackedBar
                          counts={{
                            right: section.right,
                            wrong: section.wrong,
                            unattempted: section.unattempted,
                          }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {accuracy.toFixed(1)}% accuracy on {attempted} attempted
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-xl border border-[#222f47] bg-[#151c2c] px-5 py-4">
                <p className="text-xs tracking-wide text-slate-400 uppercase">
                  Weakest section
                </p>
                <p className="mt-1.5 text-sm font-medium text-slate-100">
                  {hardest ? hardest.name : "Not enough data"}
                </p>
                {hardest ? (
                  <p className="mt-0.5 font-mono text-xs text-slate-500">
                    {hardest.accuracy.toFixed(1)}% accuracy
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-[#222f47] bg-[#151c2c] px-5 py-4">
                <p className="text-xs tracking-wide text-slate-400 uppercase">
                  Answer key spread
                </p>
                <ul className="mt-2 space-y-1">
                  {Object.keys(correctLetters)
                    .sort()
                    .map((letter) => (
                      <li key={letter} className="flex items-center gap-2 text-xs">
                        <span className="flex h-4 w-4 items-center justify-center rounded border border-[#2c3a55] font-mono text-[10px] text-slate-400">
                          {letter}
                        </span>
                        <span className="font-mono text-slate-200">
                          {correctLetters[letter]}
                        </span>
                        <span className="text-slate-500">correct answers</span>
                      </li>
                    ))}
                </ul>
              </div>

              <div className="rounded-xl border border-[#222f47] bg-[#151c2c] px-5 py-4">
                <p className="text-xs tracking-wide text-slate-400 uppercase">
                  Sheet details
                </p>
                <dl className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Questions read</dt>
                    <dd className="font-mono text-slate-200">{questionNumbers.size}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Marking</dt>
                    <dd className="font-mono text-slate-200">
                      {detectedScheme
                        ? `+${detectedScheme.correct} / −${Number(detectedScheme.negative.toFixed(3))}`
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Last wrong</dt>
                    <dd className="font-mono text-slate-200">
                      {hardestQuestion ? `Q.${hardestQuestion.number}` : "None"}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>
          </div>
        );
      }}
    </ResultShell>
  );
}

export default function AnalyticsPage() {
  return (
    <ResultProvider>
      <AnalyticsView />
    </ResultProvider>
  );
}
