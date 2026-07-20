import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { extractApiError } from "@/lib/api";
import { getStudentFinance, recordPayment } from "@/lib/resources";
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

// DebtorPayButton collects a payment right from the debtors list: the sum is applied to the
// student's open invoices oldest-first (no need to open the student's page).
export function DebtorPayButton({
  studentId,
  name,
  balance,
}: {
  studentId: string;
  name: string;
  balance: number;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState("cash");
  const over = Number(amount) > balance;
  const qc = useQueryClient();

  const m = useMutation({
    mutationFn: async () => {
      let left = Number(amount);
      if (!left || left <= 0) throw new Error("Summani kiriting");
      if (left > balance) throw new Error(`Summa qarzdan (${money(balance)}) oshmasligi kerak`);
      const fin = await getStudentFinance(studentId);
      const openInvoices = (fin.invoices ?? [])
        .filter((i) => i.paidAmount < i.amount)
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
      if (openInvoices.length === 0) throw new Error("Ochiq hisob-faktura yo'q");
      for (const inv of openInvoices) {
        if (left <= 0) break;
        const due = inv.amount - inv.paidAmount;
        const pay = Math.min(due, left);
        await recordPayment(inv.id, { amount: pay, method });
        left -= pay;
      }
    },
    onSuccess: () => {
      toast.success("To'lov qabul qilindi");
      qc.invalidateQueries({ queryKey: ["debtors"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      qc.invalidateQueries({ queryKey: ["group-finance"] });
      setOpen(false);
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <>
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setOpen(true)}>
        To'lov
      </Button>
      {open && (
        <Dialog open onOpenChange={(o) => !o && setOpen(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>To'lov qabul qilish</DialogTitle>
              <DialogDescription>
                {name} · qarz {money(balance)}
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
                  max={balance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  autoFocus
                />
                {over && (
                  <p className="mt-1 text-xs text-rose-600">Qarzdan oshmasin: {money(balance)}</p>
                )}
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
                        method === o.v
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Bekor qilish
                </Button>
                <Button type="submit" disabled={m.isPending || over} className="bg-indigo-600 hover:bg-indigo-700">
                  {m.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Qabul qilish
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
