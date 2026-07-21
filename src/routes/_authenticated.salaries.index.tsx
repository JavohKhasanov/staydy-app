import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { extractApiError } from "@/lib/api";
import {
  createSalarySlip,
  deleteSalarySlip,
  getSalaryRule,
  listSalarySlips,
  listTeachers,
  paySalarySlip,
  previewSalary,
  setSalaryRule,
  type SalaryBasis,
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

export const SALARY_KINDS: { value: SalaryKind; label: string; hint: string; unit: string }[] = [
  { value: "fixed", label: "Belgilangan (oylik)", hint: "so'm / oy", unit: "" },
  { value: "per_lesson", label: "Dars uchun", hint: "so'm / dars", unit: "dars" },
  { value: "per_student", label: "O'quvchi uchun", hint: "so'm / o'quvchi", unit: "o'quvchi" },
  { value: "percent_revenue", label: "Tushumdan %", hint: "% tushum", unit: "%" },
];

function monthBounds(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const end = new Date(y, m, 0);
  return { start: `${ym}-01`, end: `${ym}-${String(end.getDate()).padStart(2, "0")}` };
}

// ruleSummary renders "2 000 000 + 50 000/o'quvchi" from a rule/basis. null = not configured.
function ruleSummary(kind: SalaryKind, base: number, rate: number): string | null {
  const parts: string[] = [];
  if (base > 0) parts.push(money(base));
  if (kind !== "fixed" && rate > 0) {
    if (kind === "percent_revenue") parts.push(`${rate}% tushum`);
    else {
      const unit = SALARY_KINDS.find((k) => k.value === kind)?.unit ?? "";
      parts.push(`${money(rate)}/${unit}`);
    }
  }
  return parts.length ? parts.join(" + ") : null;
}

// basisText shows the month's variable driver ("8 o'quvchi", "12 dars", "tushum X").
function basisText(b: SalaryBasis): string {
  switch (b.kind) {
    case "per_lesson":
      return `${b.lessons} dars`;
    case "per_student":
      return `${b.students} o'quvchi`;
    case "percent_revenue":
      return `tushum ${money(b.revenue)}`;
    default:
      return "belgilangan";
  }
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

  // One preview per teacher for the month — gives rule (kind/base/rate) + computed gross at once.
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
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-40"
        />
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
                  <th className="px-4 py-3 font-medium">Bu oy</th>
                  <th className="px-4 py-3 font-medium text-right">Hisoblangan</th>
                  <th className="px-4 py-3 font-medium">Holat</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((t, i) => {
                  const b = previews[i]?.data;
                  const summary = b ? ruleSummary(b.kind, b.base, b.rate) : null;
                  const slip = slipByTeacher.get(t.id);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{t.fullName}</td>
                      <td className="px-4 py-3">
                        {summary ? (
                          <span className="text-slate-700 tabular-nums">{summary}</span>
                        ) : (
                          <span className="text-slate-400">Belgilanmagan</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {b ? basisText(b) : "…"}
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
                            {slip.status === "paid"
                              ? `To'langan · ${money(slip.net)}`
                              : `Kutilmoqda · ${money(slip.net)}`}
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

      {ruleFor && (
        <RuleDialog teacher={ruleFor} onClose={() => setRuleFor(null)} />
      )}
      {payFor && (
        <PayDialog teacher={payFor} month={month} onClose={() => setPayFor(null)} />
      )}
    </div>
  );
}

// RuleDialog edits one teacher's salary rule: a fixed base plus an optional variable component.
function RuleDialog({
  teacher,
  onClose,
}: {
  teacher: { id: string; name: string };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<SalaryKind>("fixed");
  const [base, setBase] = useState("");
  const [rate, setRate] = useState("");

  const rule = useQuery({
    queryKey: ["salary-rule", teacher.id],
    queryFn: () => getSalaryRule(teacher.id),
  });
  useEffect(() => {
    if (rule.data) {
      setKind(rule.data.kind);
      setBase(String(rule.data.base || ""));
      setRate(String(rule.data.rate || ""));
    }
  }, [rule.data]);

  const rateHint = SALARY_KINDS.find((k) => k.value === kind)?.hint ?? "";

  const save = useMutation({
    mutationFn: () =>
      setSalaryRule(teacher.id, {
        kind,
        base: Number(base) || 0,
        rate: kind === "fixed" ? 0 : Number(rate) || 0,
      }),
    onSuccess: () => {
      toast.success("Qoida saqlandi");
      qc.invalidateQueries({ queryKey: ["salary-rule", teacher.id] });
      qc.invalidateQueries({ queryKey: ["salary-preview", teacher.id] });
      onClose();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Maosh qoidasi — {teacher.name}</DialogTitle>
        </DialogHeader>

        {rule.isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Asosiy oylik (so'm)</Label>
              <Input
                type="number"
                min="0"
                value={base}
                onChange={(e) => setBase(e.target.value)}
                placeholder="masalan 2 000 000"
                className="mt-1 h-9"
              />
              <p className="mt-1 text-xs text-slate-400">
                Fiksa oylik. Faqat foizli/o'quvchili bo'lsa 0 qoldiring.
              </p>
            </div>

            <div>
              <Label className="text-xs">Qo'shimcha (o'zgaruvchan) qism</Label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as SalaryKind)}
                className="mt-1 block w-full h-9 rounded-md border border-slate-300 px-2 text-sm"
              >
                {SALARY_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.value === "fixed" ? "Yo'q (faqat asosiy oylik)" : k.label}
                  </option>
                ))}
              </select>
            </div>

            {kind !== "fixed" && (
              <div>
                <Label className="text-xs">Stavka ({rateHint})</Label>
                <Input
                  type="number"
                  min="0"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder={rateHint}
                  className="mt-1 h-9"
                />
              </div>
            )}

            <div className="rounded-lg bg-indigo-50 p-3 text-xs text-indigo-900">
              {ruleSummary(kind, Number(base) || 0, Number(rate) || 0) ?? "Belgilanmagan"}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending}
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

// PayDialog creates (and optionally pays) this month's slip for one teacher, gross prefilled from
// the computed preview.
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
  const [gross, setGross] = useState("");
  const [bonus, setBonus] = useState("");
  const [deduction, setDeduction] = useState("");
  const [payNow, setPayNow] = useState(true);

  const preview = useQuery({
    queryKey: ["salary-preview", teacher.id, start, end],
    queryFn: () => previewSalary(teacher.id, start, end),
  });
  useEffect(() => {
    if (preview.data && gross === "") setGross(String(preview.data.gross));
  }, [preview.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const net = (Number(gross) || 0) + (Number(bonus) || 0) - (Number(deduction) || 0);

  const save = useMutation({
    mutationFn: async () => {
      const slip = await createSalarySlip({
        teacherId: teacher.id,
        periodStart: start,
        periodEnd: end,
        gross: Number(gross) || 0,
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

  const b = preview.data;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Maosh berish — {teacher.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {b && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
              {ruleSummary(b.kind, b.base, b.rate) ?? "Qoida belgilanmagan"} · {basisText(b)} → hisoblangan{" "}
              <span className="font-semibold text-slate-900">{money(b.gross)}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Asosiy (gross)</Label>
              <Input
                type="number"
                value={gross}
                onChange={(e) => setGross(e.target.value)}
                className="mt-1 h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Bonus</Label>
              <Input
                type="number"
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
                className="mt-1 h-9"
              />
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending}
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
