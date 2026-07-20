// formatUzPhone keeps phone inputs in the canonical +998 XX XXX XX XX shape while typing.
export function formatUzPhone(v: string): string {
  const digits = v.replace(/\D/g, "").replace(/^998/, "").slice(0, 9);
  const p = ["+998"];
  if (digits.length > 0) p.push(" " + digits.slice(0, 2));
  if (digits.length > 2) p.push(" " + digits.slice(2, 5));
  if (digits.length > 5) p.push(" " + digits.slice(5, 7));
  if (digits.length > 7) p.push(" " + digits.slice(7, 9));
  return p.join("");
}

// stripPhone returns the storable form (+998XXXXXXXXX) or "" when nothing was typed.
export function stripPhone(v: string): string {
  const s = v.replace(/\s/g, "");
  return s === "+998" ? "" : s;
}
