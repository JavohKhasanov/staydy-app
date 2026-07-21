import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { extractApiError } from "@/lib/api";
import {
  createSalarySlip,
  deleteSalarySlip,
  listSalarySlips,
  listTeachers,
  paySalarySlip,
  previewSalary,
  setSalaryRule,
  type SalaryBasis,
  type SalaryGroupBasis,
  type SalaryKind,
  type SalarySlip,
} from "@/lib/resources";
import { PageHeader } from "@/components/PageHeader";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { money } from "@/features/students/FinanceSection";

export const Route = createFileRoute("/_authenticated/salaries/")({
  head: () => ({ meta: [{ title: "Maosh — Staydy" }] }),
  component: SalariesPage,
});

const KINDS: { value: SalaryKind; label: string; short: string; unit: string; driver: keyof SalaryGroupBasis }[] = [
  { value: "fixed", label: "Yo'q (faqat asosiy oylik)", short: "belgilangan", unit: "", driver: "students" },
  { value: "per_lesson", label: "Dars uchun", short: "dars", unit: "so'm / dars", driver: "lessons" },
  { value: "per_student", label: "O'quvchi uchun", short: "o'quvchi", unit: "so'm / o'quvchi", driver: "students" },
  { value: "percent_revenue", label: "Tushumdan foiz", short: "tushum %", unit: "% tushum", driver: "revenue" },
];
const kindMeta = (k: SalaryKind) => KINDS.find((x) => x.value === k) ?? KINDS[0];

function monthBounds(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const end = new Date(y, m, 0);
  return { start: `${ym}-01`, end: `${ym}-${String(end.getDate()).padStart(2, "0")}` };
}

// computeVariable mirrors the backend: variable pay for one (kind, rate) over a group's counts.
function computeVariable(kind: SalaryKind, rate: number, lessons: number, students: number, revenue: number) {
  switch (kind) {
    case "per_lesson":
      return rate * lessons;
    case "per_student":
      return rate * students;
    case "percent_revenue":
      return Math.floor((revenue * rate) / 100);
    default:
      return 0;
  }
}

// variablePart renders "50 000/o'quvchi" or "30% tushum" (no base). null when there's no variable.
function variablePart(kind: SalaryKind, rate: number): string | null {
  if (kind === "fixed" || rate <= 0) return null;
  if (kind === "percent_revenue") return `${rate}% tushum`;
  return `${money(rate)}/${kindMeta(kind).short}`;
}

// rosterSummary describes a teacher's rule in one line for the table.
function rosterSummary(b: SalaryBasis): string {
  const hasOverride = b.groups.some((g) => g.override);
  const parts: string[] = [];
  if (b.base > 0) parts.push(money(b.base));
  if (hasOverride) parts.push("guruhlar bo'yicha");
  else {
    const v = variablePart(b.kind, b.rate);
    if (v) parts.push(v);
  }
  return parts.length ? parts.join(" + ") : "Belgilanmagan";
}

function SalariesPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [ruleFor, setRuleFor] = useState<{ id: string; name: string } | null>(null);
  const [payFor, setPayFor] = useState<{ id: string; name: string } | null>(null);
  const { start, end } = monthBounds(month);

  const teachers = useQuery({ queryKey: ["teachers"], queryFn: listTeachers });
  const slips = useQuery({
    queryKey: ["salary-slips", start, end],
    queryFn: () => listSalarySlips(start, end),
  });

  const list = teachers.data ?? [];
  const previews = useQueries({
    queries: list.map((t) => ({
      queryKey: ["salary-preview", t.id, start, end],
      queryFn: () => previewSalary(t.id, start, end),
      enabled: !!t.id,
    })),
  });

  const pay = useMutation({
    mutationFn: (id: string) => paySalarySlip(id),
    onSuccess: () => {
      toast.success("To'landi deb belgilandi");
      qc.invalidateQueries({ queryKey: ["salary-slips"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteSalarySlip(id),
    onSuccess: () => {
      toast.success("O'chirildi");
      qc.invalidateQueries({ queryKey: ["salary-slips"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const slipByTeacher = useMemo(() => {
    const m = new Map<string, SalarySlip>();
    for (const s of slips.data ?? []) if (!m.has(s.teacherId)) m.set(s.teacherId, s);
    return m;
  }, [slips.data]);

  const totalPaid = (slips.data ?? []).filter((s) => s.status === "paid").reduce((a, s) => a + s.net, 0);
  const totalComputed = previews.reduce((a, p) => a + (p.data?.gross ?? 0), 0);
  const loading = teachers.isLoading || slips.isLoading;

  return (
    <div>
      <PageHeader title="Maosh" description="Har bir ustozga oylik hisoblang va to'lang" />

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
        <span className="text-sm text-slate-500">
          Hisoblangan:{" "}
          <span className="font-semibold text-slate-800 tabular-nums">{money(totalComputed)}</span>
        </span>
        <span className="text-sm text-slate-500">
          To'langan:{" "}
          <span className="font-semibold text-emerald-700 tabular-nums">{money(totalPaid)}</span>
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading && <LoadingBlock />}
        {teachers.isError && (
          <ErrorBlock message={extractApiError(teachers.error)} onRetry={() => teachers.refetch()} />
        )}
        {!loading && !teachers.isError && list.length === 0 && (
          <EmptyBlock title="Ustoz yo'q" description="Avval o'qituvchi qo'shing" />
        )}
        {!loading && list.length > 0 && (
          <div className="overflow-x-auto max-h-[64vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Ustoz</th>
                  <th className="px-4 py-3 font-medium">Maosh qoidasi</th>
                  <th className="px-4 py-3 font-medium text-right">Hisoblangan</th>
                  <th className="px-4 py-3 font-medium">Holat</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((t, i) => {
                  const b = previews[i]?.data;
                  const slip = slipByTeacher.get(t.id);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{t.fullName}</td>
                      <td className="px-4 py-3">
                        {b ? (
                          rosterSummary(b) === "Belgilanmagan" ? (
                            <span className="text-slate-400">Belgilanmagan</span>
                          ) : (
                            <span className="text-slate-700 tabular-nums">{rosterSummary(b)}</span>
                          )
                        ) : (
                          <span className="text-slate-300">…</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                        {b ? money(b.gross) : "…"}
                      </td>
                      <td className="px-4 py-3">
                        {slip ? (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              slip.status === "paid"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {slip.status === "paid" ? "To'langan" : "Kutilmoqda"} · {money(slip.net)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setRuleFor({ id: t.id, name: t.fullName })}
                            title="Qoidani tahrirlash"
                            className="text-slate-500 hover:bg-slate-100 rounded p-1.5"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {!slip && (
                            <Button
                              size="sm"
                              className="h-8 bg-indigo-600 hover:bg-indigo-700"
                              onClick={() => setPayFor({ id: t.id, name: t.fullName })}
                            >
                              <Wallet className="h-4 w-4 mr-1.5" />
                              Maosh berish
                            </Button>
                          )}
                          {slip && slip.status !== "paid" && (
                            <button
                              onClick={() => pay.mutate(slip.id)}
                              disabled={pay.isPending}
                              title="To'landi"
                              className="text-emerald-600 hover:bg-emerald-50 rounded p-1.5"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          {slip && (
                            <button
                              onClick={() => {
                                if (window.confirm("Maosh yozuvini o'chirasizmi?")) del.mutate(slip.id);
                              }}
                              title="O'chirish"
                              className="text-rose-500 hover:bg-rose-50 rounded p-1.5"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {ruleFor && <RuleDialog teacher={ruleFor} month={month} onClose={() => setRuleFor(null)} />}
      {payFor && <PayDialog teacher={payFor} month={month} onClose={() => setPayFor(null)} />}
    </div>
  );
}

type GroupOverride = { enabled: boolean; kind: SalaryKind; rate: string };

// RuleDialog edits a teacher's pay: a fixed base, a default variable component that applies to every
// group, and optional per-group overrides.
function RuleDialog({
  teacher,
  month,
  onClose,
}: {
  teacher: { id: string; name: string };
  month: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { start, end } = monthBounds(month);
  const [base, setBase] = useState("");
  const [defKind, setDefKind] = useState<SalaryKind>("fixed");
  const [defRate, setDefRate] = useState("");
  const [overrides, setOverrides] = useState<Record<string, GroupOverride>>({});

  // The preview carries the rule (base, default kind/rate) and the teacher's groups with each
  // group's effective kind/rate + whether it's an override — enough to prefill everything.
  const q = useQuery({
    queryKey: ["salary-preview", teacher.id, start, end],
    queryFn: () => previewSalary(teacher.id, start, end),
  });
  useEffect(() => {
    const b = q.data;
    if (!b) return;
    setBase(String(b.base || ""));
    setDefKind(b.kind);
    setDefRate(String(b.rate || ""));
    const ov: Record<string, GroupOverride> = {};
    for (const g of b.groups) {
      ov[g.groupId] = { enabled: g.override, kind: g.kind, rate: String(g.rate || "") };
    }
    setOverrides(ov);
  }, [q.data]);

  const groups = q.data?.groups ?? [];
  const defRateHint = kindMeta(defKind).unit;

  const save = useMutation({
    mutationFn: () =>
      setSalaryRule(teacher.id, {
        kind: defKind,
        rate: defKind === "fixed" ? 0 : Number(defRate) || 0,
        base: Number(base) || 0,
        groups: groups
          .filter((g) => overrides[g.groupId]?.enabled)
          .map((g) => {
            const o = overrides[g.groupId];
            return {
              groupId: g.groupId,
              kind: o.kind,
              rate: o.kind === "fixed" ? 0 : Number(o.rate) || 0,
            };
          }),
      }),
    onSuccess: () => {
      toast.success("Qoida saqlandi");
      qc.invalidateQueries({ queryKey: ["salary-preview", teacher.id] });
      onClose();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const setOv = (gid: string, patch: Partial<GroupOverride>) =>
    setOverrides((prev) => ({
      ...prev,
      [gid]: { ...(prev[gid] ?? { enabled: false, kind: "per_student", rate: "" }), ...patch },
    }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Maosh qoidasi — {teacher.name}</DialogTitle>
        </DialogHeader>

        {q.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Base */}
            <div>
              <Label className="text-xs font-medium text-slate-600">Asosiy oylik (fiksa)</Label>
              <Input
                type="number"
                min="0"
                value={base}
                onChange={(e) => setBase(e.target.value)}
                placeholder="masalan 2 000 000"
                className="mt-1 h-9"
              />
              <p className="mt-1 text-xs text-slate-400">Har oy beriladigan doimiy summa. Yo'q bo'lsa 0.</p>
            </div>

            {/* Default variable */}
            <div className="rounded-lg border border-slate-200 p-3 space-y-2">
              <Label className="text-xs font-medium text-slate-600">Standart qo'shimcha</Label>
              <p className="text-xs text-slate-400 -mt-1">
                Alohida sozlanmagan barcha guruhlarga amal qiladi.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={defKind}
                  onChange={(e) => setDefKind(e.target.value as SalaryKind)}
                  className="h-9 rounded-md border border-slate-300 px-2 text-sm flex-1 min-w-[9rem]"
                >
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                {defKind !== "fixed" && (
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min="0"
                      value={defRate}
                      onChange={(e) => setDefRate(e.target.value)}
                      placeholder="0"
                      className="h-9 w-28 text-right"
                    />
                    <span className="text-xs text-slate-400 whitespace-nowrap">{defRateHint}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Per-group overrides */}
            {groups.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-600">Guruhlar bo'yicha alohida</Label>
                <p className="text-xs text-slate-400 -mt-1">
                  Belgilamasangiz — guruh standart stavkada oladi.
                </p>
                <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {groups.map((g) => {
                    const o = overrides[g.groupId] ?? { enabled: false, kind: "per_student" as SalaryKind, rate: "" };
                    return (
                      <div key={g.groupId} className="p-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={o.enabled}
                            onChange={(e) => setOv(g.groupId, { enabled: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                          />
                          <span className="text-sm font-medium text-slate-800">{g.groupName}</span>
                          <span className="text-xs text-slate-400">· {g.students} o'quvchi</span>
                          {!o.enabled && <span className="ml-auto text-xs text-slate-400">standart</span>}
                        </label>
                        {o.enabled && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
                            <select
                              value={o.kind}
                              onChange={(e) => setOv(g.groupId, { kind: e.target.value as SalaryKind })}
                              className="h-9 rounded-md border border-slate-300 px-2 text-sm flex-1 min-w-[9rem]"
                            >
                              {KINDS.filter((k) => k.value !== "fixed").map((k) => (
                                <option key={k.value} value={k.value}>
                                  {k.label}
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                min="0"
                                value={o.rate}
                                onChange={(e) => setOv(g.groupId, { rate: e.target.value })}
                                placeholder="0"
                                className="h-9 w-28 text-right"
                              />
                              <span className="text-xs text-slate-400 whitespace-nowrap">
                                {kindMeta(o.kind).unit}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || q.isLoading}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// PayDialog creates (and optionally pays) this month's slip. The per-group breakdown is shown with
// an editable quantity per group so the admin can correct the auto count before paying.
function PayDialog({
  teacher,
  month,
  onClose,
}: {
  teacher: { id: string; name: string };
  month: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { start, end } = monthBounds(month);
  const [base, setBase] = useState("");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [bonus, setBonus] = useState("");
  const [deduction, setDeduction] = useState("");
  const [payNow, setPayNow] = useState(true);

  const q = useQuery({
    queryKey: ["salary-preview", teacher.id, start, end],
    queryFn: () => previewSalary(teacher.id, start, end),
  });
  useEffect(() => {
    const b = q.data;
    if (!b) return;
    setBase(String(b.base || ""));
    const c: Record<string, string> = {};
    for (const g of b.groups) c[g.groupId] = String(g[kindMeta(g.kind).driver] ?? 0);
    setCounts(c);
  }, [q.data]);

  const groups = q.data?.groups ?? [];
  const baseN = Number(base) || 0;
  const groupAmount = (g: SalaryGroupBasis) => {
    const qty = Number(counts[g.groupId] ?? 0) || 0;
    if (g.kind === "per_lesson") return computeVariable(g.kind, g.rate, qty, 0, 0);
    if (g.kind === "per_student") return computeVariable(g.kind, g.rate, 0, qty, 0);
    if (g.kind === "percent_revenue") return computeVariable(g.kind, g.rate, 0, 0, qty);
    return 0;
  };
  const gross = baseN + groups.reduce((a, g) => a + groupAmount(g), 0);
  const net = gross + (Number(bonus) || 0) - (Number(deduction) || 0);

  const save = useMutation({
    mutationFn: async () => {
      const slip = await createSalarySlip({
        teacherId: teacher.id,
        periodStart: start,
        periodEnd: end,
        gross,
        bonus: Number(bonus) || 0,
        deduction: Number(deduction) || 0,
      });
      if (payNow && slip?.id) await paySalarySlip(slip.id);
    },
    onSuccess: () => {
      toast.success(payNow ? "Maosh to'landi" : "Maosh yozildi");
      qc.invalidateQueries({ queryKey: ["salary-slips"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      onClose();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Maosh berish — {teacher.name}</DialogTitle>
        </DialogHeader>

        {q.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Base */}
            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs font-medium text-slate-600">Asosiy oylik (fiksa)</Label>
              <Input
                type="number"
                min="0"
                value={base}
                onChange={(e) => setBase(e.target.value)}
                className="h-9 w-40 text-right"
              />
            </div>

            {/* Group breakdown, editable quantities */}
            {groups.length > 0 && (
              <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                {groups.map((g) => {
                  const meta = kindMeta(g.kind);
                  return (
                    <div key={g.groupId} className="flex items-center gap-2 px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{g.groupName}</div>
                        <div className="text-xs text-slate-400">
                          {variablePart(g.kind, g.rate) ?? "belgilangan"}
                          {g.override && <span className="ml-1 text-indigo-500">· alohida</span>}
                        </div>
                      </div>
                      {g.kind !== "fixed" && (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min="0"
                            value={counts[g.groupId] ?? ""}
                            onChange={(e) => setCounts((c) => ({ ...c, [g.groupId]: e.target.value }))}
                            className="h-8 w-24 text-right"
                          />
                          <span className="text-xs text-slate-400 w-14">{meta.short}</span>
                        </div>
                      )}
                      <div className="w-28 text-right text-sm font-medium tabular-nums text-slate-900">
                        {money(groupAmount(g))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bonus / deduction */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Bonus</Label>
                <Input type="number" value={bonus} onChange={(e) => setBonus(e.target.value)} className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-xs">Ushlab qolish</Label>
                <Input
                  type="number"
                  value={deduction}
                  onChange={(e) => setDeduction(e.target.value)}
                  className="mt-1 h-9"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={payNow}
                onChange={(e) => setPayNow(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              Hozir to'landi (xarajatga yoziladi)
            </label>

            <div className="flex items-center justify-between rounded-lg bg-slate-900 px-4 py-2.5 text-white">
              <span className="text-sm">Net (qo'lga tegadigan)</span>
              <span className="text-lg font-semibold tabular-nums">{money(net)}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || q.isLoading}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {payNow ? "To'lash" : "Saqlash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
