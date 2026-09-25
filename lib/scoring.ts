import type {
  AnalysisTotals,
  MarkingScheme,
  ParsedQuestion,
  SectionResult,
} from "./types";

/** Rounds to 2 decimal places without the usual float drift (e.g. 64.666… -> 64.67). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type QuestionOutcome = "right" | "wrong" | "unattempted";

export function outcomeOf(
  question: ParsedQuestion,
): QuestionOutcome {
  if (!question.chosenLetter) return "unattempted";
  if (question.correctLetter && question.chosenLetter === question.correctLetter) {
    return "right";
  }
  // A chosen option with no detectable correct answer cannot be scored.
  if (!question.correctLetter) return "unattempted";
  return "wrong";
}

export function marksFor(
  right: number,
  wrong: number,
  scheme: MarkingScheme,
): number {
  return round2(right * scheme.correct - wrong * scheme.negative);
}

export function buildSections(
  questions: ParsedQuestion[],
  scheme: MarkingScheme,
): SectionResult[] {
  const order: string[] = [];
  const buckets = new Map<string, SectionResult>();

  for (const question of questions) {
    const name = question.section || "All Questions";
    let bucket = buckets.get(name);
    if (!bucket) {
      bucket = {
        name,
        total: 0,
        right: 0,
        wrong: 0,
        unattempted: 0,
        marks: 0,
      };
      buckets.set(name, bucket);
      order.push(name);
    }
    bucket.total += 1;
    const outcome = outcomeOf(question);
    if (outcome === "right") bucket.right += 1;
    else if (outcome === "wrong") bucket.wrong += 1;
    else bucket.unattempted += 1;
  }

  return order.map((name) => {
    const bucket = buckets.get(name)!;
    return { ...bucket, marks: marksFor(bucket.right, bucket.wrong, scheme) };
  });
}

export function buildTotals(
  questions: ParsedQuestion[],
  scheme: MarkingScheme,
): AnalysisTotals {
  let right = 0;
  let wrong = 0;
  let unattempted = 0;

  for (const question of questions) {
    const outcome = outcomeOf(question);
    if (outcome === "right") right += 1;
    else if (outcome === "wrong") wrong += 1;
    else unattempted += 1;
  }

  const total = questions.length;
  const attempted = right + wrong;
  const maxMarks = round2(total * scheme.correct);
  const marks = marksFor(right, wrong, scheme);

  return {
    total,
    right,
    wrong,
    unattempted,
    marks,
    accuracy: attempted ? round2((right / attempted) * 100) : 0,
    scorePercent: maxMarks ? round2((marks / maxMarks) * 100) : 0,
    maxMarks,
  };
}
