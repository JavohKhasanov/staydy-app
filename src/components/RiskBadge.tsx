import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types";

export function normalizeRisk(level?: RiskLevel | string): "red" | "yellow" | "green" {
  const v = String(level ?? "").toLowerCase();
  if (v === "red" || v === "high") return "red";
  if (v === "yellow" || v === "medium" || v === "amber") return "yellow";
  return "green";
}

const LABELS = {
  red: "Qizil",
  yellow: "Sariq",
  green: "Yashil",
} as const;

const STYLES = {
  red: "text-rose-600 bg-rose-50 border-rose-200",
  yellow: "text-amber-600 bg-amber-50 border-amber-200",
  green: "text-emerald-600 bg-emerald-50 border-emerald-200",
} as const;

export function RiskBadge({
  level,
  className,
}: {
  level?: RiskLevel | string;
  className?: string;
}) {
  const k = normalizeRisk(level);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STYLES[k],
        className,
      )}
    >
      {LABELS[k]}
    </span>
  );
}