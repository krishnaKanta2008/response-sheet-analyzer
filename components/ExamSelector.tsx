"use client";

import { GraduationCap } from "lucide-react";

import { EXAM_SCHEMES } from "@/lib/exams";

const SELECT_CLASS =
  "w-full appearance-none rounded-lg border border-[#222f47] bg-[#0f1523] px-3 py-2.5 text-sm font-medium text-slate-100 outline-none transition-colors focus:border-blue-500";

interface ExamSelectorProps {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export default function ExamSelector({ value, onChange, disabled }: ExamSelectorProps) {

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="exam-type"
        className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-slate-400 uppercase"
      >
        <GraduationCap className="h-3.5 w-3.5" aria-hidden />
        Exam Type
      </label>
      <select
        id="exam-type"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={SELECT_CLASS}
      >
        <option value="rrb">{EXAM_SCHEMES.rrb.label}</option>
      </select>
    </div>
  );
}
