// Canonical weekday codes stored in group.scheduleDays as "mon,wed,fri".
export const WEEKDAYS = [
  { code: "mon", short: "Du", full: "Dushanba" },
  { code: "tue", short: "Se", full: "Seshanba" },
  { code: "wed", short: "Cho", full: "Chorshanba" },
  { code: "thu", short: "Pa", full: "Payshanba" },
  { code: "fri", short: "Ju", full: "Juma" },
  { code: "sat", short: "Sha", full: "Shanba" },
  { code: "sun", short: "Yak", full: "Yakshanba" },
] as const;

export type WeekdayCode = (typeof WEEKDAYS)[number]["code"];

// Odd days (toq): Mon/Wed/Fri. Even days (juft): Tue/Thu/Sat.
export const ODD_DAYS: WeekdayCode[] = ["mon", "wed", "fri"];
export const EVEN_DAYS: WeekdayCode[] = ["tue", "thu", "sat"];

const CODES = new Set(WEEKDAYS.map((w) => w.code));

// parseDays reads a stored scheduleDays string into ordered canonical codes. Tolerates the old
// free-text values (e.g. "Dush, Chor") by matching short/full labels too.
export function parseDays(raw?: string): WeekdayCode[] {
  if (!raw) return [];
  const wanted = new Set(
    raw
      .split(/[,;/\s]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
  );
  const out: WeekdayCode[] = [];
  for (const w of WEEKDAYS) {
    if (
      wanted.has(w.code) ||
      wanted.has(w.short.toLowerCase()) ||
      wanted.has(w.full.toLowerCase())
    ) {
      out.push(w.code);
    }
  }
  return out;
}

export function formatDays(codes: string[]): string {
  return WEEKDAYS.filter((w) => codes.includes(w.code)).map((w) => w.code).join(",");
}

// Short Uzbek label for display, e.g. "Du, Cho, Ju".
export function daysLabel(raw?: string): string {
  const codes = parseDays(raw);
  if (codes.length === 0) return "—";
  return WEEKDAYS.filter((w) => codes.includes(w.code)).map((w) => w.short).join(", ");
}

// Parity of a group's days for the odd/even filter. A group counts as "odd" if it meets on any
// odd day, "even" if on any even day (a group can be both if it mixes).
export function matchesParity(raw: string | undefined, parity: "odd" | "even"): boolean {
  const codes = parseDays(raw);
  const set: WeekdayCode[] = parity === "odd" ? ODD_DAYS : EVEN_DAYS;
  return codes.some((c) => set.includes(c));
}

function isValid(code: string): code is WeekdayCode {
  return CODES.has(code as WeekdayCode);
}
export { isValid as isWeekday };
