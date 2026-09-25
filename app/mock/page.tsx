"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, CircleX, RotateCcw } from "lucide-react";

import ResultShell from "@/components/ResultShell";
import { ResultProvider } from "@/lib/result-context";
import { marksFor, round2 } from "@/lib/scoring";
import type { AnalysisResult, ParsedQuestion } from "@/lib/types";

type Answers = Record<number, string>;

function QuestionBlock({
  question,
  answer,
  revealed,
  onAnswer,
}: {
  question: ParsedQuestion;
  answer: string | undefined;
  revealed: boolean;
  onAnswer: (letter: string) => void;
}) {
  const isCorrect = answer === question.correctLetter;

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
        {revealed ? (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              isCorrect ? "text-green-500" : "text-red-500"
            }`}
          >
            {isCorrect ? (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <CircleX className="h-3.5 w-3.5" aria-hidden />
            )}
            {isCorrect ? "Correct" : `Correct answer: ${question.correctLetter ?? "?"}`}
          </span>
        ) : null}
      </header>

      <p className="px-4 py-3 text-sm leading-relaxed text-slate-200">
        {question.text || <span className="text-slate-600">Question text unavailable.</span>}
      </p>

      <ul className="border-t border-[#222f47]">
        {question.options.map((option) => {
          const picked = answer === option.letter;
          const showCorrect = revealed && option.isCorrect;
          const showWrong = revealed && picked && !option.isCorrect;
          return (
            <li key={option.letter}>
              <button
                type="button"
                disabled={revealed}
                onClick={() => onAnswer(option.letter)}
                className={`flex w-full items-start gap-3 border-b border-[#1a2233] px-4 py-2.5 text-left text-sm transition-colors last:border-b-0 ${
                  showCorrect
                    ? "bg-green-500/10 text-green-300"
                    : showWrong
                      ? "bg-red-500/10 text-red-300"
                      : picked
                        ? "bg-blue-500/10 text-blue-200"
                        : "text-slate-400 hover:bg-[#1a2233]"
                } ${revealed ? "cursor-default" : "cursor-pointer"}`}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[#2c3a55] font-mono text-[11px]">
                  {option.letter}
                </span>
                <span className="flex-1">{option.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function MockView() {
  const [answers, setAnswers] = useState<Answers>({});
  const [revealed, setRevealed] = useState(false);
  const [cursor, setCursor] = useState(0);

  return (
    <ResultShell title="Re-attempt as Mock" subtitle="Fresh attempt, scored against the key">
      {(result: AnalysisResult) => {
        const questions = result.questions;
        const scheme = result.detectedScheme;
        const answeredCount = Object.keys(answers).length;
        const current = questions[cursor];
        const finished = revealed;

        const scored = finished
          ? questions.reduce(
              (acc, question) => {
                const pick = answers[question.number];
                if (!pick) return acc;
                if (pick === question.correctLetter) acc.right += 1;
                else acc.wrong += 1;
                return acc;
              },
              { right: 0, wrong: 0 },
            )
          : null;

        return (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#222f47] bg-[#151c2c] px-4 py-3">
              <p className="text-xs text-slate-400">
                Question{" "}
                <span className="font-mono text-slate-100">
                  {Math.min(cursor + 1, questions.length)}
                </span>{" "}
                of {questions.length} ·{" "}
                <span className="font-mono text-slate-100">{answeredCount}</span> answered
              </p>
              <div className="flex items-center gap-2">
                {!finished ? (
                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    disabled={answeredCount === 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Submit &amp; score
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAnswers({});
                      setRevealed(false);
                      setCursor(0);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#222f47] px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-[#3b4a68]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    Try again
                  </button>
                )}
              </div>
            </div>

            {finished && scored && scheme ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="col-span-2 rounded-xl border border-[#222f47] bg-[#151c2c] px-5 py-4">
                  <p className="text-xs tracking-wide text-slate-400 uppercase">
                    Mock score
                  </p>
                  <p className="font-mono text-3xl font-bold text-slate-50">
                    {marksFor(scored.right, scored.wrong, scheme).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-[#222f47] bg-[#151c2c] px-4 py-4">
                  <p className="text-xs tracking-wide text-slate-400 uppercase">Correct</p>
                  <p className="font-mono text-2xl font-bold text-green-500">{scored.right}</p>
                </div>
                <div className="rounded-xl border border-[#222f47] bg-[#151c2c] px-4 py-4">
                  <p className="text-xs tracking-wide text-slate-400 uppercase">Wrong</p>
                  <p className="font-mono text-2xl font-bold text-red-500">{scored.wrong}</p>
                </div>
              </div>
            ) : null}

            {current ? (
              <QuestionBlock
                question={current}
                answer={answers[current.number]}
                revealed={finished}
                onAnswer={(letter) =>
                  setAnswers((prev) => ({ ...prev, [current.number]: letter }))
                }
              />
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCursor((c) => Math.max(0, c - 1))}
                disabled={cursor === 0}
                className="rounded-lg border border-[#222f47] px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-[#3b4a68] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <p className="font-mono text-xs text-slate-500">
                {round2(((cursor + 1) / questions.length) * 100).toFixed(0)}% through
              </p>
              <button
                type="button"
                onClick={() => setCursor((c) => Math.min(questions.length - 1, c + 1))}
                disabled={cursor >= questions.length - 1}
                className="inline-flex items-center gap-2 rounded-lg border border-[#222f47] px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-[#3b4a68] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>

            {finished ? (
              <p className="text-center text-xs text-slate-500">
                Every question is shown with the correct answer highlighted. Use{" "}
                <span className="text-slate-300">Review Paper</span> for the full list.
              </p>
            ) : null}
          </div>
        );
      }}
    </ResultShell>
  );
}

export default function MockPage() {
  return (
    <ResultProvider>
      <MockView />
    </ResultProvider>
  );
}
