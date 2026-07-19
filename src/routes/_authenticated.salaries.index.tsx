import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Check } from "lucide-react";
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
  type SalaryKind,
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

export const SALARY_KINDS: { value: SalaryKind; label: string; hint: string }[] = [
  { value: "fixed", label: "Belgilangan (oylik)", hint: "so'm / oy" },
  { value: "per_lesson", label: "Dars uchun", hint: "so'm / dars" },
  { value: "per_student", label: "O'quvchi uchun", hint: "so'm / o'quvchi" },
  { value: "percent_revenue", label: "Tushumdan %", hint: "% tushum" },
];
const kindLabel = (k: string) => SALARY_KINDS.find((s) => s.value === k)?.label ?? k;

function monthBounds(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const end = new Date(y, m, 0);
  return { start: `${ym}-01`, end: `${ym}-${String(end.getDate()).padStart(2, "0")}` };
}

function SalariesPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [dialogOpen, setDialogOpen] = useState(false);
  const { start, end } = monthBounds(month);

  const slips = useQuery({
    queryKey: ["salary-slips", start, end],
    queryFn: () => listSalarySlips(start, end),
  });

  const pay = useMutation({
    mutationFn: (id: string) => paySalarySlip(id),
    onSuccess: () => {
      toast.success("To'landi deb belgilandi");
      qc.invalidateQueries({ queryKey: ["salary-slips"] });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteSalarySlip(id),
    onSuccess: () => {
      toast.success("O'chirildi");
      qc.invalidateQueries({ queryKey: ["salary-slips"] });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const list = slips.data ?? [];
  const totalNet = list.reduce((s, x) => s + x.net, 0);

  return (
    <div>
      <PageHeader
        title="Maosh"
        description="Ustozlar oyligini hisoblang va to'lang"
        actions={
          <Button onClick={() => setDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" />
            Maosh qo'shish
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-40"
        />
        {list.length > 0 && (
          <span className="text-sm text-slate-500">
            Jami net: <span className="font-semibold text-slate-800 tabular-nums">{money(totalNet)}</span>
          </span>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {slips.isLoading && <LoadingBlock />}
        {slips.isError && (
          <ErrorBlock message={extractApiError(slips.error)} onRetry={() => slips.refetch()} />
        )}
        {!slips.isLoading && !slips.isError && list.length === 0 && (
          <EmptyBlock title="Maosh yozuvi yo'q" description="Bu oy uchun maosh qo'shing" />
        )}
        {list.length > 0 && (
          <div className="overflow-x-auto max-h-[62vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Ustoz</th>
                  <th className="px-4 py-3 font-medium">Davr</th>
                  <th className="px-4 py-3 font-medium text-right">Asosiy</th>
                  <th className="px-4 py-3 font-medium text-right">Bonus</th>
                  <th className="px-4 py-3 font-medium text-right">Ushlab</th>
                  <th className="px-4 py-3 font-medium text-right">Net</th>
                  <th className="px-4 py-3 font-medium">Holat</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.teacherName}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {s.periodStart} – {s.periodEnd}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{money(s.gross)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                      {s.bonus ? `+${money(s.bonus)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-rose-700">
                      {s.deduction ? `−${money(s.deduction)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{money(s.net)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.status === "paid"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {s.status === "paid" ? "To'langan" : "Kutilmoqda"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {s.status !== "paid" && (
                          <button
                            onClick={() => pay.mutate(s.id)}
                            disabled={pay.isPending}
                            title="To'landi"
                            className="text-emerald-600 hover:bg-emerald-50 rounded p-1"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (window.confirm("O'chirasizmi?")) del.mutate(s.id);
                          }}
                          className="text-rose-500 hover:bg-rose-50 rounded p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewSalaryDialog open={dialogOpen} onOpenChange={setDialogOpen} defaultMonth={month} />
    </div>
  );
}

function NewSalaryDialog({
  open,
  onOpenChange,
  defaultMonth,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultMonth: string;
}) {
  const qc = useQueryClient();
  const [teacherId, setTeacherId] = useState("");
  const [kind, setKind] = useState<SalaryKind>("fixed");
  const [rate, setRate] = useState("");
  const [gross, setGross] = useState("");
  const [bonus, setBonus] = useState("");
  const [deduction, setDeduction] = useState("");
  const { start, end } = monthBounds(defaultMonth);

  const teachers = useQuery({ queryKey: ["teachers"], queryFn: listTeachers, enabled: open });

  // Load the teacher's rule when selected.
  const rule = useQuery({
    queryKey: ["salary-rule", teacherId],
    queryFn: () => getSalaryRule(teacherId),
    enabled: open && !!teacherId,
  });
  useEffect(() => {
    if (rule.data) {
      setKind(rule.data.kind);
      setRate(String(rule.data.rate || ""));
    }
  }, [rule.data]);

  // Preview computes gross from real data for the month.
  const preview = useQuery({
    queryKey: ["salary-preview", teacherId, start, end],
    queryFn: () => previewSalary(teacherId, start, end),
    enabled: open && !!teacherId,
  });
  useEffect(() => {
    if (preview.data) setGross(String(preview.data.gross));
  }, [preview.data]);

  const saveRule = useMutation({
    mutationFn: () => setSalaryRule(teacherId, { kind, rate: Number(rate) || 0 }),
    onSuccess: () => {
      toast.success("Qoida saqlandi");
      qc.invalidateQueries({ queryKey: ["salary-rule", teacherId] });
      qc.invalidateQueries({ queryKey: ["salary-preview", teacherId] });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const [payNow, setPayNow] = useState(false);
  const save = useMutation({
    mutationFn: async () => {
      const slip = await createSalarySlip({
        teacherId,
        periodStart: start,
        periodEnd: end,
        gross: Number(gross) || 0,
        bonus: Number(bonus) || 0,
        deduction: Number(deduction) || 0,
      });
      // "To'langan deb belgilash": pay immediately (also records the maosh expense).
      if (payNow && slip?.id) await paySalarySlip(slip.id);
    },
    onSuccess: () => {
      toast.success("Maosh qo'shildi");
      qc.invalidateQueries({ queryKey: ["salary-slips"] });
      onOpenChange(false);
      setTeacherId("");
      setGross("");
      setBonus("");
      setDeduction("");
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const net = (Number(gross) || 0) + (Number(bonus) || 0) - (Number(deduction) || 0);
  const b = preview.data;

  const kindHint = useMemo(() => SALARY_KINDS.find((s) => s.value === kind)?.hint ?? "", [kind]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Maosh qo'shish — {defaultMonth}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Ustoz</Label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="mt-1 block w-full h-9 rounded-md border border-slate-300 px-2 text-sm"
            >
              <option value="">Tanlang...</option>
              {teachers.data?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
          </div>

          {teacherId && (
            <>
              {/* Salary rule editor */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-medium text-slate-600 mb-2">Maosh qoidasi</div>
                <div className="flex flex-wrap items-end gap-2">
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as SalaryKind)}
                    className="h-9 rounded-md border border-slate-300 px-2 text-sm"
                  >
                    {SALARY_KINDS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                  <div>
                    <Input
                      type="number"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      placeholder={kindHint}
                      className="h-9 w-28"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9"
                    disabled={saveRule.isPending}
                    onClick={() => saveRule.mutate()}
                  >
                    Qoidani saqlash
                  </Button>
                </div>
              </div>

              {/* Preview basis */}
              {b && (
                <div className="rounded-lg bg-indigo-50 p-3 text-xs text-indigo-900">
                  <span className="font-medium">{kindLabel(b.kind)}</span> · darslar: {b.lessons} ·
                  o'quvchilar: {b.students} · tushum: {money(b.revenue)} → hisoblangan:{" "}
                  <span className="font-semibold">{money(b.gross)}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Asosiy oylik (gross)</Label>
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
                To'langan deb belgilash (xarajatga yoziladi)
              </label>
              <div className="flex items-center justify-between rounded-lg bg-slate-900 px-4 py-2.5 text-white">
                <span className="text-sm">Net (qo'lga tegadigan)</span>
                <span className="text-lg font-semibold tabular-nums">{money(net)}</span>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={!teacherId || save.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
