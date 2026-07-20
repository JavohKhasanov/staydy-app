import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Banknote, Loader2 } from "lucide-react";

import { extractApiError } from "@/lib/api";
import {
  createInvoice,
  getGroupFinance,
  getStudentFinance,
  recordPayment,
  type GroupFinanceRow,
} from "@/lib/resources";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const money = (n: number) => n.toLocaleString("uz-UZ").replace(/,/g, " ") + " so'm";
const thisMonth = () => new Date().toISOString().slice(0, 7);

// A new student may attend a few sessions before paying; past this count with no invoice we
// flag them (center-configurable later).
const GRACE_LESSONS = 3;

type Status = "paid" | "partial" | "unpaid" | "none" | "overdue";
function statusOf(r: GroupFinanceRow): Status {
  if (r.invoiced === 0) return r.attended >= GRACE_LESSONS ? "overdue" : "none";
  if (r.paid >= r.invoiced) return "paid";
  if (r.paid > 0) return "partial";
  return "unpaid";
}
const STATUS_UI: Record<Status, { label: string; cls: string }> = {
  paid: { label: "To'lagan", cls: "bg-emerald-50 text-emerald-700" },
  partial: { label: "Qisman", cls: "bg-amber-50 text-amber-700" },
  unpaid: { label: "Qarzdor", cls: "bg-rose-50 text-rose-600" },
  none: { label: "Hisob yo'q", cls: "bg-slate-100 text-slate-500" },
  overdue: { label: "To'lov kutilmoqda", cls: "bg-rose-600 text-white" },
};

// GroupPayments is the group page's fee roster: month picker + per-student paid/partial/unpaid
// status with inline collect (the batch fee-status pattern from Gibbon/Frappe/Modme).
export function GroupPayments({
  groupId,
  coursePrice,
}: {
  groupId: string;
  coursePrice?: number;
}) {
  const [month, setMonth] = useState(thisMonth());
  const [paying, setPaying] = useState<GroupFinanceRow | null>(null);

  const q = useQuery({
    queryKey: ["group-finance", groupId, month],
    queryFn: () => getGroupFinance(groupId, month),
  });
  const rows = q.data?.students ?? [];
  const totals = rows.reduce(
    (a, r) => ({ invoiced: a.invoiced + r.invoiced, paid: a.paid + r.paid }),
    { invoiced: 0, paid: 0 },
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Banknote className="h-4 w-4 text-slate-400" />
          To'lovlar
          {totals.invoiced > 0 && (
            <span className="text-xs font-normal text-slate-500">
              {money(totals.paid)} / {money(totals.invoiced)}
            </span>
          )}
        </span>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700"
        />
      </div>

      {q.isLoading && (
        <div className="flex items-center justify-center p-8 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      {q.isError && (
        <div className="p-4 text-sm text-rose-600">{extractApiError(q.error)}</div>
      )}
      {!q.isLoading && !q.isError && rows.length === 0 && (
        <div className="p-6 text-center text-sm text-slate-500">Guruhda talaba yo'q.</div>
      )}

      {rows.length > 0 && (
        <div className="divide-y divide-slate-100">
          {rows.map((r) => {
            const st = statusOf(r);
            const ui = STATUS_UI[st];
            return (
              <div key={r.studentId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <span className="text-sm font-medium text-slate-800">{r.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs tabular-nums text-slate-500">
                    {r.invoiced > 0 ? `${money(r.paid)} / ${money(r.invoiced)}` : "—"}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ui.cls}`}>
                    {ui.label}
                    {st === "overdue" ? ` · ${r.attended} dars` : ""}
                  </span>
                  {st !== "paid" && (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPaying(r)}>
                      To'lov
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {paying && (
        <CollectDialog
          row={paying}
          month={month}
          groupId={groupId}
          coursePrice={coursePrice}
          onClose={() => setPaying(null)}
        />
      )}
    </div>
  );
}

// CollectDialog records a payment for one student in the chosen month. If the student has no
// invoice for the month yet, one is created first (defaulting to the course price).
function CollectDialog({
  row,
  month,
  groupId,
  coursePrice,
  onClose,
}: {
  row: GroupFinanceRow;
  month: string;
  groupId: string;
  coursePrice?: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const remaining = row.invoiced - row.paid;
  const defaultAmount = row.invoiced > 0 ? remaining : (coursePrice ?? 0);
  const [amount, setAmount] = useState(defaultAmount > 0 ? String(defaultAmount) : "");
  const [method, setMethod] = useState("cash");

  const m = useMutation({
    mutationFn: async () => {
      const sum = Number(amount);
      if (!sum || sum <= 0) throw new Error("Summani kiriting");
      if (row.invoiced === 0) {
        // No invoice for this month yet — create one (course price or the entered sum).
        const inv = await createInvoice(row.studentId, {
          amount: coursePrice && coursePrice > 0 ? coursePrice : sum,
          period: month,
          groupId,
          dueDate: `${month}-10`,
        });
        await recordPayment(inv.id, { amount: sum, method });
      } else {
        // Pay against this month's open invoice.
        const fin = await getStudentFinance(row.studentId);
        const open = (fin.invoices ?? []).find(
          (i) => i.period === month && i.paidAmount < i.amount && (!i.groupId || i.groupId === groupId),
        );
        if (!open) throw new Error("Ochiq hisob-faktura topilmadi");
        await recordPayment(open.id, { amount: sum, method });
      }
    },
    onSuccess: () => {
      toast.success("To'lov qabul qilindi");
      qc.invalidateQueries({ queryKey: ["group-finance", groupId] });
      qc.invalidateQueries({ queryKey: ["debtors"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error && e.message ? e.message : extractApiError(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>To'lov qabul qilish</DialogTitle>
          <DialogDescription>
            {row.name} · {month}
            {row.invoiced > 0 && ` · qoldiq ${money(remaining)}`}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
          className="grid gap-4"
        >
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Summa (so'm)</Label>
            <Input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Usul</Label>
            <div className="flex gap-1.5">
              {[
                { v: "cash", l: "Naqd" },
                { v: "card", l: "Karta" },
                { v: "transfer", l: "O'tkazma" },
              ].map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setMethod(o.v)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    method === o.v ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={m.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {m.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Qabul qilish
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
