export type ExamId = "rrb";

/** A marking scheme. `negative` is stored as a positive magnitude. */
export interface MarkingScheme {
  id: ExamId;
  label: string;
  correct: number;
  negative: number;
}

export interface CandidateDetails {
  registrationNumber: string;
  rollNumber: string;
  name: string;
  community: string;
  venue: string;
  examDate: string;
  examTime: string;
  subject: string;
}

export interface ParsedOption {
  letter: string;
  text: string;
  isCorrect: boolean;
}

export interface ParsedQuestion {
  number: number;
  section: string;
  text: string;
  options: ParsedOption[];
  correctLetter: string | null;
  /** null when the candidate left the question blank. */
  chosenLetter: string | null;
  status: string;
  questionType: string;
}

export interface SectionResult {
  name: string;
  total: number;
  right: number;
  wrong: number;
  unattempted: number;
  marks: number;
}

export interface AnalysisTotals {
  total: number;
  right: number;
  wrong: number;
  unattempted: number;
  marks: number;
  /** Correct as a percentage of attempted questions. */
  accuracy: number;
  /** Marks as a percentage of the maximum obtainable. */
  scorePercent: number;
  maxMarks: number;
}

export interface AnalysisResult {
  candidate: CandidateDetails;
  examName: string;
  /** Scheme read from the sheet itself, when it declares one. */
  detectedScheme: MarkingScheme | null;
  questions: ParsedQuestion[];
  sections: SectionResult[];
  totals: AnalysisTotals;
  /** Non-fatal problems, e.g. panels with no detectable correct answer. */
  warnings: string[];
}
