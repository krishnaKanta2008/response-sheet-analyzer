import type { SectionResult } from "@/lib/types";

interface ResultTableProps {
  sections: SectionResult[];
  /**
   * Authoritative overall marks. Section values are already rounded, so
   * re-summing them can drift by a hundredth.
   */
  grandTotal?: number;
}

const HEAD_CLASS = "px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-400 uppercase";

export default function ResultTable({ sections, grandTotal }: ResultTableProps) {
  const totals = sections.reduce(
    (acc, section) => ({
      total: acc.total + section.total,
      right: acc.right + section.right,
      wrong: acc.wrong + section.wrong,
      unattempted: acc.unattempted + section.unattempted,
    }),
    { total: 0, right: 0, wrong: 0, unattempted: 0 },
  );

  return (
    <section className="overflow-hidden rounded-xl border border-[#222f47] bg-[#151c2c]">
      <header className="border-b border-[#222f47] bg-[#1b2436] px-5 py-3">
        <h2 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
          Sectional Summary
        </h2>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="border-b border-[#222f47]">
              <th scope="col" className={HEAD_CLASS}>
                Section
              </th>
              <th scope="col" className={`${HEAD_CLASS} text-center`}>
                Total
              </th>
              <th scope="col" className={`${HEAD_CLASS} text-center`}>
                Right
              </th>
              <th scope="col" className={`${HEAD_CLASS} text-center`}>
                Wrong
              </th>
              <th scope="col" className={`${HEAD_CLASS} text-center`}>
                Skipped
              </th>
              <th scope="col" className={`${HEAD_CLASS} text-right`}>
                Marks
              </th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <tr
                key={section.name}
                className="border-b border-[#222f47] transition-colors last:border-b-0 hover:bg-[#1a2233]"
              >
                <th
                  scope="row"
                  className="px-4 py-3 text-left text-sm font-medium text-slate-200"
                >
                  {section.name}
                </th>
                <td className="px-4 py-3 text-center font-mono text-sm text-slate-300">
                  {section.total}
                </td>
                <td className="px-4 py-3 text-center font-mono text-sm font-semibold text-green-500">
                  {section.right}
                </td>
                <td className="px-4 py-3 text-center font-mono text-sm font-semibold text-red-500">
                  {section.wrong}
                </td>
                <td className="px-4 py-3 text-center font-mono text-sm text-slate-500">
                  {section.unattempted}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-slate-100">
                  {section.marks.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#2c3a55] bg-[#1b2436] font-bold">
              <th scope="row" className="px-4 py-3 text-left text-sm text-slate-100">
                TOTAL
              </th>
              <td className="px-4 py-3 text-center font-mono text-sm text-slate-100">
                {totals.total}
              </td>
              <td className="px-4 py-3 text-center font-mono text-sm text-green-500">
                {totals.right}
              </td>
              <td className="px-4 py-3 text-center font-mono text-sm text-red-500">
                {totals.wrong}
              </td>
              <td className="px-4 py-3 text-center font-mono text-sm text-slate-300">
                {totals.unattempted}
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm text-slate-100">
                {(
                  grandTotal ?? sections.reduce((sum, section) => sum + section.marks, 0)
                ).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
