import type { MarkingScheme } from "./types";

/**
 * RRB sheets state their own scheme ("Correct Answer will carry 1 mark per
 * Question. / Incorrect Answer will carry 1/3 Negative mark per Question."),
 * which `htmlParser` reads back. These are the fallbacks.
 */
export const EXAM_SCHEMES: Record<"rrb", MarkingScheme> = {
  rrb: { id: "rrb", label: "RRB (All Levels)", correct: 1, negative: 1 / 3 },
};

export const DEFAULT_EXAM_ID = "rrb" as const;

export function getScheme(id: string): MarkingScheme {
  if (id === "custom") {
    return { id: "custom", label: "Custom", correct: 1, negative: 0 };
  }
  return EXAM_SCHEMES.rrb;
}

/** Section names used only when a sheet carries no `.section-cntnr` blocks. */
export const RRB_FALLBACK_SECTIONS = [
  "General Awareness",
  "General Intelligence and Reasoning",
  "General Ability",
  "Quantitative Aptitude",
];
