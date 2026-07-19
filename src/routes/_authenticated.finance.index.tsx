import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, Scale, TrendingDown, TrendingUp, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { extractApiError } from "@/lib/api";
import {
  createExpense,
  deleteExpense,
  getDebtors,
  getFinanceSummary,
  listExpenses,
} from "@/lib/resources";
import { PageHeader } from "@/components/PageHeader";
import { DebtorPayButton } from "@/features/finance/DebtorPayButton";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/features/students/FinanceSection";

export const Route = createFileRoute("/_authenticated/finance/")({
  head: () => ({ meta: [{ title: "Moliya — Staydy" }] }),
  component: FinancePage,
});

export const EXPENSE_CATEGORIES = [
  { value: "ijara", label: "Ijara" },
  { value: "kommunal", label: "Kommunal" },
  { value: "maosh", label: "Maosh" },
  { value: "reklama", label: "Reklama" },
  { value: "jihoz", label: "Jihoz" },
  { value: "boshqa", label: "Boshqa" },
];
const catLabel = (v: string) => EXPENSE_CATEGORIES.find((c) => c.value === v)?.label ?? v;

function FinancePage() {
  const summary = useQuery({ queryKey: ["finance-summary"], queryFn: getFinanceSummary });
  const debtors = useQuery({ queryKey: ["debtors"], queryFn: getDebtors });
  const profit = summary.data?.monthProfit ?? 0;

  return (
    <div>
      <PageHeader title="Moliya" description="Tushum, xarajat, foyda va qarzdorlar" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Oylik tushum"
          value={summary.data?.monthIncome}
          icon={TrendingUp}
          accent="text-emerald-600 bg-emerald-50"
          loading={summary.isLoading}
        />
        <StatCard
          label="Oylik xarajat"
          value={summary.data?.monthExpense}
          icon={TrendingDown}
          accent="text-rose-600 bg-rose-50"
          loading={summary.isLoading}
        />
        <StatCard
          label="Oylik foyda"
          value={profit}
          icon={Scale}
          accent={profit >= 0 ? "text-indigo-600 bg-indigo-50" : "text-rose-600 bg-rose-50"}
          valueClass={profit >= 0 ? "text-indigo-700" : "text-rose-700"}
          loading={summary.isLoading}
        />
        <StatCard
          label="Umumiy qarz"
          value={summary.data?.totalDebt}
          icon={AlertTriangle}
          accent="text-amber-600 bg-amber-50"
          loading={summary.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpensesSection />

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden self-start">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Qarzdorlar</h2>
          </div>
          {debtors.isLoading && <LoadingBlock />}
          {debtors.isError && (
            <ErrorBlock message={extractApiError(debtors.error)} onRetry={() => debtors.refetch()} />
          )}
          {!debtors.isLoading && !debtors.isError && (debtors.data?.length ?? 0) === 0 && (
            <EmptyBlock title="Qarzdorlar yo'q" description="Hamma to'lovlar joyida" />
          )}
          {!debtors.isLoading && !debtors.isError && (debtors.data?.length ?? 0) > 0 && (
            <ul className="divide-y divide-slate-100">
              {debtors.data?.map((d) => (
                <li key={d.studentId} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <Link
                    to="/students/$id"
                    params={{ id: d.studentId }}
                    className="font-medium text-slate-900 hover:text-indigo-600"
                  >
                    {d.name}
                  </Link>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums text-rose-700 font-medium">{money(d.balance)}</span>
                    <DebtorPayButton studentId={d.studentId} name={d.name} balance={d.balance} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ExpensesSection() {
  const qc = useQueryClient();
  const [category, setCategory] = useState("ijara");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const list = useQuery({ queryKey: ["expenses"], queryFn: () => listExpenses() });

  const add = useMutation({
    mutationFn: () =>
      createExpense({ category, amount: Number(amount), spentAt: date }),
    onSuccess: () => {
      toast.success("Xarajat qo'shildi");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      toast.success("O'chirildi");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error("Summani kiriting");
      return;
    }
    add.mutate();
  };

  const data = list.data;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden self-start">
      <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-rose-400" />
          <h2 className="text-sm font-semibold text-slate-900">Xarajatlar (shu oy)</h2>
        </div>
        {data && <span className="text-xs text-slate-500 tabular-nums">Jami: {money(data.total)}</span>}
      </div>

      <form onSubmit={submit} className="flex flex-wrap items-end gap-2 px-5 py-3 border-b border-slate-100">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 rounded-md border border-slate-300 px-2 text-sm"
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Summa (so'm)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-9 w-32"
        />
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 w-40"
        />
        <Button type="submit" disabled={add.isPending} className="h-9 bg-indigo-600 hover:bg-indigo-700">
          Qo'shish
        </Button>
      </form>

      {data && data.byCategory.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-5 py-2 border-b border-slate-100">
          {data.byCategory.map((c) => (
            <span key={c.category} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {catLabel(c.category)}: <span className="tabular-nums">{money(c.total)}</span>
            </span>
          ))}
        </div>
      )}

      {list.isLoading && <LoadingBlock />}
      {list.isError && (
        <ErrorBlock message={extractApiError(list.error)} onRetry={() => list.refetch()} />
      )}
      {data && data.expenses.length === 0 && (
        <EmptyBlock title="Xarajat yo'q" description="Shu oy uchun xarajat qo'shing" />
      )}
      {data && data.expenses.length > 0 && (
        <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {data.expenses.map((ex) => (
            <li key={ex.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
              <div className="min-w-0">
                <span className="font-medium text-slate-800">{catLabel(ex.category)}</span>
                <span className="text-slate-400 text-xs ml-2">{ex.spentAt}</span>
                {ex.note && <span className="text-slate-400 text-xs ml-2 truncate">· {ex.note}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="tabular-nums text-slate-700">{money(ex.amount)}</span>
                <button
                  onClick={() => {
                    if (window.confirm("O'chirasizmi?")) del.mutate(ex.id);
                  }}
                  className="text-rose-500 hover:bg-rose-50 rounded p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  valueClass,
  loading,
}: {
  label: string;
  value?: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  valueClass?: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${valueClass ?? "text-slate-900"}`}>
        {loading ? "…" : money(value ?? 0)}
      </div>
    </div>
  );
}
