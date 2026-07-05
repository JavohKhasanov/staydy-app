import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, RotateCcw, Trash2, Wallet } from "lucide-react";

import { extractApiError } from "@/lib/api";
import {
  createInvoice,
  deleteInvoice,
  deletePayment,
  getStudentFinance,
  recordPayment,
  refundPayment,
  type Invoice,
} from "@/lib/resources";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const INVOICE_STATUS: Record<string, { label: string; cls: string }> = {
  unpaid: { label: "To'lanmagan", cls: "bg-slate-100 text-slate-600" },
  partial: { label: "Qisman", cls: "bg-amber-50 text-amber-700" },
  paid: { label: "To'langan", cls: "bg-emerald-50 text-emerald-700" },
  overdue: { label: "Muddati o'tgan", cls: "bg-rose-50 text-rose-700" },
};
const METHOD_LABELS: Record<string, string> = {
  cash: "Naqd",
  card: "Karta",
  transfer: "O'tkazma",
};

export function money(n: number): string {
  return `${n.toLocaleString("ru-RU")} so'm`;
}

export function FinanceSection({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient();
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [payFor, setPayFor] = useState<Invoice | null>(null);
  const [refundFor, setRefundFor] = useState<Invoice | null>(null);

  const finance = useQuery({
    queryKey: ["finance", studentId],
    queryFn: () => getStudentFinance(studentId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["finance", studentId] });
    queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
    queryClient.invalidateQueries({ queryKey: ["debtors"] });
  };

  const delInvoice = useMutation({
    mutationFn: (id: string) => deleteInvoice(id),
    onSuccess: () => {
      toast.success("Hisob o'chirildi");
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });
  const delPayment = useMutation({
    mutationFn: (id: string) => deletePayment(id),
    onSuccess: () => {
      toast.success("To'lov bekor qilindi");
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const data = finance.data;
  const balance = data?.balance ?? 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Wallet className="h-4 w-4 text-indigo-600" />
          Moliya
        </h2>
        <Button
          size="sm"
          onClick={() => setInvoiceOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Hisob qo'shish
        </Button>
      </div>

      <div
        className={`mb-4 rounded-lg px-4 py-3 ${
          balance > 0 ? "bg-rose-50" : "bg-emerald-50"
        }`}
      >
        <div className="text-xs text-slate-500">Balans</div>
        <div
          className={`text-xl font-semibold tabular-nums ${
            balance > 0 ? "text-rose-700" : "text-emerald-700"
          }`}
        >
          {balance > 0 ? `${money(balance)} qarz` : "Qarzi yo'q"}
        </div>
      </div>

      {finance.isLoading ? (
        <p className="text-sm text-slate-500">Yuklanmoqda...</p>
      ) : (data?.invoices.length ?? 0) === 0 ? (
        <p className="text-sm text-slate-500">Hali hisob chiqarilmagan.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2 pr-3 font-medium">Davr</th>
                <th className="py-2 pr-3 font-medium text-right">Summa</th>
                <th className="py-2 pr-3 font-medium text-right">Qoldiq</th>
                <th className="py-2 pr-3 font-medium">Holat</th>
                <th className="py-2 pr-3 font-medium">Muddat</th>
                <th className="py-2 pr-3 font-medium text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.invoices.map((iv) => {
                const st = INVOICE_STATUS[iv.status] ?? {
                  label: iv.status,
                  cls: "bg-slate-100 text-slate-600",
                };
                return (
                  <tr key={iv.id}>
                    <td className="py-2 pr-3 text-slate-800">{iv.period || "—"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-700">
                      {money(iv.amount)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-700">
                      {money(iv.balance)}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{iv.dueDate ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center justify-end gap-1">
                        {iv.balance > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => setPayFor(iv)}
                          >
                            To'lov
                          </Button>
                        )}
                        {iv.paidAmount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Qaytarish"
                            className="h-7 text-amber-700 hover:bg-amber-50"
                            onClick={() => setRefundFor(iv)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={delInvoice.isPending}
                          onClick={() => {
                            if (window.confirm("Hisobni o'chirasizmi? To'lovlari ham o'chadi."))
                              delInvoice.mutate(iv.id);
                          }}
                          className="text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(data?.payments.length ?? 0) > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            To'lovlar tarixi
          </h3>
          <ul className="space-y-1.5">
            {data?.payments.map((pmt) => (
              <li
                key={pmt.id}
                className="flex items-center justify-between text-sm border border-slate-100 rounded-md px-3 py-1.5"
              >
                <span className="text-slate-600">
                  {pmt.paidAt.slice(0, 10)} · {METHOD_LABELS[pmt.method] ?? pmt.method}
                  {pmt.amount < 0 && <span className="ml-1 text-amber-600">· Qaytarildi</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className={`tabular-nums font-medium ${
                      pmt.amount < 0 ? "text-amber-700" : "text-emerald-700"
                    }`}
                  >
                    {pmt.amount < 0 ? `−${money(-pmt.amount)}` : `+${money(pmt.amount)}`}
                  </span>
                  <button
                    onClick={() => {
                      if (window.confirm("To'lovni bekor qilasizmi?")) delPayment.mutate(pmt.id);
                    }}
                    disabled={delPayment.isPending}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <InvoiceDialog
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
        studentId={studentId}
        onDone={invalidate}
      />
      <PaymentDialog
        invoice={payFor}
        onClose={() => setPayFor(null)}
        onDone={invalidate}
      />
      <RefundDialog
        invoice={refundFor}
        onClose={() => setRefundFor(null)}
        onDone={invalidate}
      />
    </div>
  );
}

function RefundDialog({
  invoice,
  onClose,
  onDone,
}: {
  invoice: Invoice | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({ amount: "", method: "cash", note: "" });
  useEffect(() => {
    if (invoice) setForm({ amount: String(invoice.paidAmount), method: "cash", note: "" });
  }, [invoice]);

  const mutation = useMutation({
    mutationFn: () =>
      refundPayment(invoice!.id, {
        amount: Number(form.amount),
        method: form.method,
        note: form.note || undefined,
      }),
    onSuccess: () => {
      toast.success("Pul qaytarildi");
      onDone();
      onClose();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  return (
    <Dialog open={!!invoice} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pulni qaytarish</DialogTitle>
        </DialogHeader>
        {invoice && (
          <p className="text-sm text-slate-500 -mt-2">
            To'langan: <b className="text-slate-800">{money(invoice.paidAmount)}</b>
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (Number(form.amount) > 0) mutation.mutate();
          }}
          className="grid grid-cols-1 gap-4"
        >
          <FField label="Qaytariladigan summa (so'm)" required>
            <Input
              type="number"
              min="1"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              required
            />
          </FField>
          <FField label="Usul">
            <Select value={form.method} onValueChange={(v) => setForm((f) => ({ ...f, method: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Naqd</SelectItem>
                <SelectItem value="card">Karta</SelectItem>
                <SelectItem value="transfer">O'tkazma</SelectItem>
              </SelectContent>
            </Select>
          </FField>
          <FField label="Sabab">
            <Input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Masalan: o'quvchi chiqib ketdi"
            />
          </FField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Bekor
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Qaytarish
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceDialog({
  open,
  onOpenChange,
  studentId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  studentId: string;
  onDone: () => void;
}) {
  const [form, setForm] = useState({ amount: "", dueDate: "", period: "", note: "" });
  useEffect(() => {
    if (open) setForm({ amount: "", dueDate: "", period: "", note: "" });
  }, [open]);

  const mutation = useMutation({
    mutationFn: () =>
      createInvoice(studentId, {
        amount: Number(form.amount),
        dueDate: form.dueDate || undefined,
        period: form.period || undefined,
        note: form.note || undefined,
      }),
    onSuccess: () => {
      toast.success("Hisob chiqarildi");
      onDone();
      onOpenChange(false);
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yangi hisob</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (Number(form.amount) > 0) mutation.mutate();
          }}
          className="grid grid-cols-1 gap-4"
        >
          <FField label="Summa (so'm)" required>
            <Input
              type="number"
              min="1"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              required
              placeholder="500000"
            />
          </FField>
          <div className="grid grid-cols-2 gap-4">
            <FField label="Davr">
              <Input
                value={form.period}
                onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                placeholder="2026-07 / Iyul"
              />
            </FField>
            <FField label="To'lov muddati">
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </FField>
          </div>
          <FField label="Izoh">
            <Input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Ixtiyoriy"
            />
          </FField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Bekor
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Saqlash
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({
  invoice,
  onClose,
  onDone,
}: {
  invoice: Invoice | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({ amount: "", method: "cash", note: "" });
  useEffect(() => {
    if (invoice) setForm({ amount: String(invoice.balance), method: "cash", note: "" });
  }, [invoice]);

  const mutation = useMutation({
    mutationFn: () =>
      recordPayment(invoice!.id, {
        amount: Number(form.amount),
        method: form.method,
        note: form.note || undefined,
      }),
    onSuccess: () => {
      toast.success("To'lov qabul qilindi");
      onDone();
      onClose();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  return (
    <Dialog open={!!invoice} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>To'lov qabul qilish</DialogTitle>
        </DialogHeader>
        {invoice && (
          <p className="text-sm text-slate-500 -mt-2">
            Qoldiq: <b className="text-slate-800">{money(invoice.balance)}</b>
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (Number(form.amount) > 0) mutation.mutate();
          }}
          className="grid grid-cols-1 gap-4"
        >
          <FField label="Summa (so'm)" required>
            <Input
              type="number"
              min="1"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              required
            />
          </FField>
          <FField label="Usul">
            <Select value={form.method} onValueChange={(v) => setForm((f) => ({ ...f, method: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Naqd</SelectItem>
                <SelectItem value="card">Karta</SelectItem>
                <SelectItem value="transfer">O'tkazma</SelectItem>
              </SelectContent>
            </Select>
          </FField>
          <FField label="Izoh">
            <Input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Ixtiyoriy"
            />
          </FField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Bekor
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Qabul qilish
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </Label>
      {children}
    </div>
  );
}
