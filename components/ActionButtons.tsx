import Link from "next/link";
import { BarChart3, BookOpen, RefreshCw } from "lucide-react";

const ACTIONS = [
  {
    href: "/review",
    label: "Review Paper",
    icon: BookOpen,
    className: "bg-blue-600 hover:bg-blue-500",
  },
  {
    href: "/mock",
    label: "Re-attempt as Mock",
    icon: RefreshCw,
    className: "bg-emerald-600 hover:bg-emerald-500",
  },
  {
    href: "/analytics",
    label: "View Analytics",
    icon: BarChart3,
    className: "bg-purple-600 hover:bg-purple-500",
  },
] as const;

export default function ActionButtons() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {ACTIONS.map(({ href, label, icon: Icon, className }) => (
        <Link
          key={href}
          href={href}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/20 transition-colors ${className}`}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {label}
        </Link>
      ))}
    </div>
  );
}
