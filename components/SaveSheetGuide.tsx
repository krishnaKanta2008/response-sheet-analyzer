"use client";

import { HelpCircle, Monitor, Smartphone } from "lucide-react";

const PC_STEPS: Array<{ label: string; steps: string[] }> = [
  {
    label: "Chrome or Edge (Windows)",
    steps: [
      "Open your response sheet in the browser and wait for every question to load.",
      "Press Ctrl + S.",
      "In the dialog, set “Save as type” to “Webpage, HTML Only”. This saves a single file — pick “Webpage, Complete” only if you also want the images folder.",
      "Save it anywhere you can find, such as your Downloads folder.",
      "Drop the file ending in .html into the box above.",
    ],
  },
  {
    label: "Firefox (Windows / Mac)",
    steps: [
      "Open the response sheet and let it finish loading.",
      "Press Ctrl + S (Windows) or Cmd + S (Mac).",
      "Set “Save as type” to “Webpage, HTML” for a single file.",
      "Drop the .html file into the box above.",
    ],
  },
  {
    label: "Safari (Mac)",
    steps: [
      "Open the response sheet in Safari.",
      "Choose File → Save As.",
      "Set “File Format” to “Webpage, Single File” (.html).",
      "Drop the .html file into the box above.",
    ],
  },
];

const MOBILE_NOTES: Array<{ label: string; steps: string[] }> = [
  {
    label: "Android",
    steps: [
      "Most Android browsers have no “save page” option, so this is awkward on a phone.",
      "Some versions save the page from the share sheet: open the sheet, tap the ⋮ menu, choose Share, then “Save to Files” or “Files”. Check whether the saved file ends in .html — if it does, drop it in.",
      "If there is no such option, the reliable route is to open the sheet on a computer.",
    ],
  },
  {
    label: "iPhone / iPad",
    steps: [
      "Safari cannot save a page as a usable .html file — “Save to Files” produces a .webarchive, which this app cannot read.",
      "On iOS, the dependable path is to open the response sheet on a computer and save it there, then transfer the .html file across.",
    ],
  },
];

export default function SaveSheetGuide() {
  return (
    <details className="group rounded-xl border border-[#222f47] bg-[#151c2c]">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:text-slate-100 [&::-webkit-details-marker]:hidden">
        <HelpCircle className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        <span className="flex-1">How do I save my response sheet?</span>
        <span className="text-xs text-slate-500 transition-transform group-open:rotate-90">
          &rsaquo;
        </span>
      </summary>

      <div className="border-t border-[#222f47] px-4 py-4">
        <p className="mb-4 text-xs leading-relaxed text-slate-400">
          You need the response sheet as a single{" "}
          <span className="font-mono text-slate-300">.html</span> file. Save it from
          the browser while you are still logged in to the exam portal, then drop it
          above. Nothing is uploaded — the file is read entirely in your browser.
        </p>

        <div className="grid gap-5 lg:grid-cols-2">
          <section>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-200 uppercase">
              <Monitor className="h-3.5 w-3.5" aria-hidden />
              On a computer
            </h3>
            {PC_STEPS.map((group) => (
              <div key={group.label} className="mt-3">
                <p className="text-xs font-medium text-slate-300">{group.label}</p>
                <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-slate-400">
                  {group.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </section>

          <section>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-200 uppercase">
              <Smartphone className="h-3.5 w-3.5" aria-hidden />
              On a phone or tablet
            </h3>
            {MOBILE_NOTES.map((group) => (
              <div key={group.label} className="mt-3">
                <p className="text-xs font-medium text-slate-300">{group.label}</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-400">
                  {group.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-200/80">
              Phone browsers generally cannot save a page as an{" "}
              <span className="font-mono">.html</span> file. If that blocks you,
              open the response sheet on a computer instead — it takes a minute.
            </p>
          </section>
        </div>

        <section className="mt-5 border-t border-[#222f47] pt-4">
          <h3 className="text-xs font-semibold tracking-wide text-slate-200 uppercase">
            If the file will not load
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-400">
            <li>
              Check the extension really is <span className="font-mono">.html</span>.
              Saving as PDF or plain text will not work.
            </li>
            <li>
              If you saved “Webpage, Complete”, make sure you picked the{" "}
              <span className="font-mono">.html</span> file and not the companion
              folder.
            </li>
            <li>
              The page must be the response sheet itself, not a login page or a
              results summary.
            </li>
          </ul>
        </section>
      </div>
    </details>
  );
}
