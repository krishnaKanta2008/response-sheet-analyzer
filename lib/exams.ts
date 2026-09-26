import type { MarkingScheme } from "./types";

/**
 * RRB sheets state their own scheme ("Correct Answer will carry 1 mark per
 * Question. / Incorrect Answer will carry 1/3 Negative mark per Question."),
 * which `htmlParser` reads back. This is the fallback.
 */
export const EXAM_SCHEMES: Record<"rrb", MarkingScheme> = {
  rrb: { id: "rrb", label: "RRB (All Levels)", correct: 1, negative: 1 / 3 },
};

export const DEFAULT_EXAM_ID = "rrb" as const;

/** Section names used only when a sheet carries no `.section-cntnr` blocks. */
export const RRB_FALLBACK_SECTIONS = [
  "General Awareness",
  "General Intelligence and Reasoning",
  "General Ability",
  "Quantitative Aptitude",
];
