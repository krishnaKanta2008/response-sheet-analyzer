import {
  Calendar,
  Clock,
  Hash,
  MapPin,
  ShieldCheck,
  User,
} from "lucide-react";

import type { CandidateDetails, MarkingScheme } from "@/lib/types";

interface CandidateInfoProps {
  candidate: CandidateDetails;
  examName: string;
  scheme: MarkingScheme | null;
}

const FIELDS: Array<{
  key: keyof CandidateDetails;
  label: string;
  icon: typeof Hash;
}> = [
  { key: "rollNumber", label: "Roll Number", icon: Hash },
  { key: "name", label: "Candidate Name", icon: User },
  { key: "venue", label: "Venue Name", icon: MapPin },
  { key: "examDate", label: "Exam Date", icon: Calendar },
  { key: "examTime", label: "Exam Time", icon: Clock },
  { key: "community", label: "Community", icon: ShieldCheck },
  { key: "registrationNumber", label: "Registration No.", icon: Hash },
];

export default function CandidateInfo({
  candidate,
  examName,
  scheme,
}: CandidateInfoProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#222f47] bg-[#151c2c]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222f47] bg-[#1b2436] px-5 py-3">
        <h2 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
          {examName || "Response Sheet"}
        </h2>
        {scheme ? (
          <span className="rounded-full border border-[#222f47] bg-[#0f1523] px-3 py-1 font-mono text-xs text-slate-300">
            +{scheme.correct} / −{Number(scheme.negative.toFixed(3))}
          </span>
        ) : null}
      </header>

      <dl className="grid grid-cols-1 gap-px bg-[#222f47] sm:grid-cols-2 lg:grid-cols-4">
        {FIELDS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="bg-[#151c2c] px-5 py-4">
            <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-slate-400 uppercase">
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </dt>
            <dd className="mt-1.5 truncate text-sm font-medium text-slate-100">
              {candidate[key] || <span className="text-slate-600">Not provided</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
