import { WEEKDAYS, ODD_DAYS, EVEN_DAYS, parseDays, formatDays } from "@/lib/weekdays";

// WeekdayPicker edits a group's recurring days as a set of pills. Value/onChange use the canonical
// stored string ("mon,wed,fri"). Quick "Toq"/"Juft" buttons set the common Mon-Wed-Fri / Tue-Thu-Sat
// patterns.
export function WeekdayPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const selected = parseDays(value);
  const toggle = (code: string) => {
    const next = selected.includes(code as never)
      ? selected.filter((c) => c !== code)
      : [...selected, code];
    onChange(formatDays(next as string[]));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAYS.map((w) => {
          const on = selected.includes(w.code);
          return (
            <button
              key={w.code}
              type="button"
              onClick={() => toggle(w.code)}
              className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition ${
                on
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {w.short}
            </button>
          );
        })}
      </div>
      <div className="flex gap-3 text-xs text-slate-500">
        <button type="button" onClick={() => onChange(formatDays(ODD_DAYS))} className="hover:text-indigo-600">
          Toq (Du/Cho/Ju)
        </button>
        <button type="button" onClick={() => onChange(formatDays(EVEN_DAYS))} className="hover:text-indigo-600">
          Juft (Se/Pa/Sha)
        </button>
        <button type="button" onClick={() => onChange("")} className="hover:text-rose-600">
          Tozalash
        </button>
      </div>
    </div>
  );
}
