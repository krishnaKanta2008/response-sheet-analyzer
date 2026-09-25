#!/usr/bin/env node
/**
 * Regression check for the response-sheet parser.
 *
 * Compiles lib/ to CommonJS in a scratch directory, parses a saved response
 * sheet with jsdom, and compares the result against the expected values baked
 * in below.
 *
 *   node scripts/verify-parse.mjs <path-to-sheet.html>
 *
 * Exits non-zero when anything does not match, so it can be wired into CI.
 */
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { JSDOM } from "jsdom";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildDir = path.join(projectRoot, ".verify-build");
const require = createRequire(import.meta.url);

/**
 * Identity fields are asserted by *shape*, not by value. The reference sheet
 * belongs to a real person, and this repository is public, so their name, roll
 * number and registration number are deliberately not baked in here.
 */
const CANDIDATE_SHAPE = {
  registrationNumber: /^N\d{10,}$/,
  rollNumber: /^\d{15}$/,
  name: /^\S+\s+\S+/,
  community: /^[A-Z]{1,3}$/,
  venue: /\S/,
  examDate: /^\d{2}\/\d{2}\/\d{4}$/,
  examTime: /\S/,
  subject: /\S/,
};

/** The actual regression signal: what the parser must compute. */
const EXPECTED = {
  totals: { total: 120, right: 68, wrong: 10, unattempted: 42, marks: 64.67 },
  sections: [
    { name: "General Awareness", total: 50, right: 21, wrong: 7, unattempted: 22, marks: 18.67 },
    { name: "Mathematics", total: 35, right: 15, wrong: 1, unattempted: 19, marks: 14.67 },
    {
      name: "General Intelligence and Reasoning",
      total: 35,
      right: 32,
      wrong: 2,
      unattempted: 1,
      marks: 31.33,
    },
  ],
  scheme: { correct: 1, negative: 1 / 3 },
};

function compileLib() {
  rmSync(buildDir, { recursive: true, force: true });
  const tsc = path.join(projectRoot, "node_modules", "typescript", "bin", "tsc");
  execFileSync(
    process.execPath,
    [
      tsc,
      "lib/types.ts",
      "lib/exams.ts",
      "lib/scoring.ts",
      "lib/htmlParser.ts",
      "--outDir",
      buildDir,
      "--module",
      "commonjs",
      "--moduleResolution",
      "node",
      "--target",
      "es2020",
      "--lib",
      "es2020,dom",
      "--skipLibCheck",
      "--strict",
    ],
    { cwd: projectRoot, stdio: "pipe" },
  );
}

const failures = [];
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}: ${JSON.stringify(actual)}`);
  if (!ok) {
    console.log(`      expected ${JSON.stringify(expected)}`);
    failures.push(label);
  }
}

const sheetPath = process.argv[2];
if (!sheetPath) {
  console.error("Usage: node scripts/verify-parse.mjs <path-to-sheet.html>");
  process.exit(2);
}
if (!existsSync(sheetPath)) {
  console.error(`No such file: ${sheetPath}`);
  process.exit(2);
}

compileLib();
const { parseSheetFromDocument, stripHeavyAssets } = require(
  path.join(buildDir, "htmlParser.js"),
);

const { readFileSync } = await import("node:fs");
const html = stripHeavyAssets(readFileSync(sheetPath, "utf8"));
const dom = new JSDOM(html);
const result = parseSheetFromDocument(dom.window.document);

console.log(`\nParsed ${sheetPath}`);
console.log(`  exam        : ${result.examName}`);
console.log(`  scheme      : +${result.detectedScheme?.correct} / -${result.detectedScheme?.negative}`);
console.log(`  questions   : ${result.questions.length}`);
console.log(`  warnings    : ${result.warnings.length ? result.warnings.join("; ") : "none"}`);
console.log("");

check("detected scheme", {
  correct: result.detectedScheme?.correct,
  negative: result.detectedScheme?.negative,
}, EXPECTED.scheme);
check("totals", {
  total: result.totals.total,
  right: result.totals.right,
  wrong: result.totals.wrong,
  unattempted: result.totals.unattempted,
  marks: result.totals.marks,
}, EXPECTED.totals);

// Every identity field must be read, even though the values are not asserted.
for (const [field, pattern] of Object.entries(CANDIDATE_SHAPE)) {
  const value = result.candidate[field];
  check(`candidate.${field} matches ${pattern}`, pattern.test(value), true);
}
check("sections", result.sections, EXPECTED.sections);
check("warnings", result.warnings, []);

const sample = result.questions[0];
check("Q1 shape", {
  number: sample.number,
  section: sample.section,
  correct: sample.correctLetter,
  chosen: sample.chosenLetter,
  options: sample.options.length,
}, { number: 1, section: "General Awareness", correct: "B", chosen: null, options: 4 });

rmSync(buildDir, { recursive: true, force: true });
void pathToFileURL;

console.log("");
if (failures.length) {
  console.error(`${failures.length} check(s) failed: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("All checks passed.");
