import { EXAM_SCHEMES, RRB_FALLBACK_SECTIONS } from "./exams";
import type {
  AnalysisResult,
  CandidateDetails,
  MarkingScheme,
  ParsedOption,
  ParsedQuestion,
} from "./types";
import { buildSections, buildTotals } from "./scoring";

/**
 * Response sheets embed the candidate's photograph as a base64 data URI, which
 * is roughly 40% of the document and slows parsing down for no benefit.
 */
export function stripHeavyAssets(html: string): string {
  return html.replace(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/gi, "");
}

const FIELD_MAP: Record<string, keyof CandidateDetails> = {
  "registration number": "registrationNumber",
  "roll number": "rollNumber",
  "candidate name": "name",
  community: "community",
  "test centre name": "venue",
  "test date": "examDate",
  "test time": "examTime",
  subject: "subject",
};

const EMPTY_CANDIDATE: CandidateDetails = {
  registrationNumber: "",
  rollNumber: "",
  name: "",
  community: "",
  venue: "",
  examDate: "",
  examTime: "",
  subject: "",
};

function text(node: Element | null | undefined): string {
  return (node?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function collapse(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Reads label/value cells out of one of the sheet's tables. The markup is
 * malformed in places (the "Chosen Option" row is missing its opening `<tr>`),
 * so cells are paired by position rather than by row.
 */
function readLabelValuePairs(scope: Element): Map<string, string> {
  const pairs = new Map<string, string>();
  let pending: string | null = null;

  for (const cell of Array.from(scope.querySelectorAll("td"))) {
    const value = text(cell);
    if (!value) continue;
    if (value.endsWith(":")) {
      pending = value.slice(0, -1).trim();
      continue;
    }
    if (pending) {
      pairs.set(pending, value);
      pending = null;
    }
  }
  return pairs;
}

function parseCandidate(doc: Document): CandidateDetails {
  const scope = doc.querySelector(".main-info-pnl") ?? doc.querySelector("table");
  const candidate: CandidateDetails = { ...EMPTY_CANDIDATE };
  if (!scope) return candidate;

  // The header table is well formed, but its labels carry no trailing colon,
  // so cells are read row by row rather than paired positionally.
  for (const row of Array.from(scope.querySelectorAll("tr"))) {
    const cells = Array.from(row.children).filter(
      (child) => child.tagName === "TD" || child.tagName === "TH",
    );
    if (cells.length < 2) continue;
    const label = text(cells[0]).replace(/:$/, "").trim();
    const key = FIELD_MAP[label.toLowerCase()];
    // Rows such as "Application Photograph" hold an image and no text.
    if (!key) continue;
    candidate[key] = text(cells[1]);
  }
  return candidate;
}

function parseFraction(raw: string): number | null {
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/**
 * The sheet states its own marking scheme in the `* Note` block, e.g.
 * "Correct Answer will carry 1 mark per Question." /
 * "Incorrect Answer will carry 1/3 Negative mark per Question."
 */
function parseDetectedScheme(doc: Document): MarkingScheme | null {
  const note =
    doc.querySelector(".main-info-pnl")?.textContent ?? doc.body?.textContent ?? "";
  const correct = note.match(/correct answer will carry\s*([\d.]+(?:\s*\/\s*[\d.]+)?)\s*mark/i);
  const negative = note.match(/incorrect answer will carry\s*([\d.]+(?:\s*\/\s*[\d.]+)?)\s*negative/i);
  if (!correct) return null;

  const correctValue = parseFraction(correct[1].replace(/\s+/g, ""));
  const negativeValue = negative
    ? parseFraction(negative[1].replace(/\s+/g, ""))
    : null;
  if (correctValue === null) return null;

  return {
    id: "rrb",
    label: "Detected from sheet",
    correct: correctValue,
    negative: negativeValue ?? EXAM_SCHEMES.rrb.negative,
  };
}

const OPTION_LETTER = /^\s*([A-Z])\s*[.)]\s*/;

function parseOptions(panel: Element): {
  options: ParsedOption[];
  correctLetter: string | null;
} {
  const options: ParsedOption[] = [];
  let correctLetter: string | null = null;

  const cells = panel.querySelectorAll("td.rightAns, td.wrngAns");
  for (const cell of Array.from(cells)) {
    const raw = text(cell);
    const match = raw.match(OPTION_LETTER);
    if (!match) continue;
    const isCorrect = cell.classList.contains("rightAns");
    options.push({
      letter: match[1],
      text: raw.slice(match[0].length).trim(),
      isCorrect,
    });
    if (isCorrect && !correctLetter) correctLetter = match[1];
  }
  return { options, correctLetter };
}

function parsePanel(panel: Element, section: string, fallbackNumber: number): ParsedQuestion {
  const labelCells = Array.from(panel.querySelectorAll("table.questionRowTbl td.bold"));
  const numberCell = labelCells.find((cell) => /^Q\.\s*\d+/i.test(text(cell)));
  const numberMatch = numberCell ? text(numberCell).match(/(\d+)/) : null;
  const textCell = labelCells.find((cell) => cell !== numberCell);

  const { options, correctLetter } = parseOptions(panel);

  const menu = panel.querySelector("table.menu-tbl");
  const meta = menu ? readLabelValuePairs(menu) : new Map<string, string>();

  const chosenRaw = collapse(meta.get("Chosen Option"));
  const chosenLetter = /^[A-Z]$/.test(chosenRaw) ? chosenRaw : null;

  return {
    number: numberMatch ? Number(numberMatch[1]) : fallbackNumber,
    section,
    text: text(textCell),
    options,
    correctLetter,
    chosenLetter,
    status: collapse(meta.get("Status")) || (chosenLetter ? "Answered" : "Not Answered"),
    questionType: collapse(meta.get("Question Type")),
  };
}

/** `.section-cntnr` blocks are structural, so grouping needs no inference. */
function collectQuestions(doc: Document): { questions: ParsedQuestion[]; usedFallbackSections: boolean } {
  let groups = Array.from(doc.querySelectorAll(".grp-cntnr > .section-cntnr"));
  if (groups.length === 0) {
    groups = Array.from(doc.querySelectorAll(".section-cntnr"));
  }

  if (groups.length > 0) {
    const questions: ParsedQuestion[] = [];
    let counter = 0;
    for (const group of groups) {
      const name =
        collapse(group.querySelector(".section-lbl")?.textContent?.replace(/^Section\s*:?\s*/i, "")) ||
        `Section ${groups.indexOf(group) + 1}`;
      for (const panel of Array.from(group.querySelectorAll(".question-pnl"))) {
        questions.push(parsePanel(panel, name, ++counter));
      }
    }
    if (questions.length > 0) return { questions, usedFallbackSections: false };
  }

  // No section markup: fall back to a single bucket rather than guessing counts.
  const questions = Array.from(doc.querySelectorAll(".question-pnl")).map((panel, index) =>
    parsePanel(panel, RRB_FALLBACK_SECTIONS[0] ?? "All Questions", index + 1),
  );
  return { questions, usedFallbackSections: questions.length > 0 };
}

function collectWarnings(questions: ParsedQuestion[]): string[] {
  const warnings: string[] = [];
  const seen = new Set<number>();
  let missingCorrect = 0;
  let missingOptions = 0;
  let duplicateNumbers = 0;

  for (const question of questions) {
    if (seen.has(question.number)) duplicateNumbers += 1;
    seen.add(question.number);
    if (!question.correctLetter) missingCorrect += 1;
    if (question.options.length < 2) missingOptions += 1;
  }

  if (missingCorrect) {
    warnings.push(
      `${missingCorrect} question${missingCorrect === 1 ? "" : "s"} had no option marked with the correct-answer class, so they were scored as unattempted.`,
    );
  }
  if (missingOptions) {
    warnings.push(
      `${missingOptions} question${missingOptions === 1 ? "" : "s"} had fewer than two readable options.`,
    );
  }
  if (duplicateNumbers) {
    warnings.push(`${duplicateNumbers} duplicate question numbers were found.`);
  }
  return warnings;
}

export function parseSheetFromDocument(doc: Document): AnalysisResult {
  const { questions, usedFallbackSections } = collectQuestions(doc);
  const detectedScheme = parseDetectedScheme(doc);
  const scheme = detectedScheme ?? EXAM_SCHEMES.rrb;
  const candidate = parseCandidate(doc);
  const warnings = collectWarnings(questions);

  if (usedFallbackSections) {
    warnings.push(
      "No section headings were found in this sheet, so every question was grouped under a single section.",
    );
  }
  if (questions.length === 0) {
    warnings.push(
      "No question panels were detected. This does not look like a response sheet.",
    );
  }

  return {
    candidate,
    examName: candidate.subject || scheme.label,
    detectedScheme,
    questions,
    sections: buildSections(questions, scheme),
    totals: buildTotals(questions, scheme),
    warnings,
  };
}

/** Browser entry point. Requires a global `DOMParser`. */
export function parseSheetHtml(html: string): AnalysisResult {
  if (typeof DOMParser === "undefined") {
    throw new Error("parseSheetHtml requires a DOMParser (browser only).");
  }
  const doc = new DOMParser().parseFromString(stripHeavyAssets(html), "text/html");
  return parseSheetFromDocument(doc);
}
