import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, Target, TrendingUp, Users, Wallet } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { extractApiError } from "@/lib/api";
import {
  getDashboard,
  getDebtors,
  getFinanceSummary,
  listLeads,
  listLessons,
} from "@/lib/resources";
import type { DashboardData } from "@/lib/types";
import { money } from "@/features/students/FinanceSection";
import { STAGE_OPTIONS } from "@/features/leads/LeadDialog";
import { LEADS_ENABLED } from "@/lib/flags";
import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "@/components/StateBlocks";

export const Route = createFileRoute("/_authenticated/")({
  // Teachers have no org-wide dashboard; send them to their own students list.
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("ss_user");
    if (!raw) return;
    let role: string | undefined;
    try {
      role = (JSON.parse(raw) as { role?: string }).role;
    } catch {
      return;
    }
    if (role === "teacher") throw redirect({ to: "/me/students" });
  },
  head: () => ({
    meta: [{ title: "Boshqaruv paneli — Staydy" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });

  return (
    <div>
      <PageHeader
        title="Boshqaruv paneli"
        description="Talabalar holati va xavf darajasi"
      />
      {isLoading && <LoadingBlock />}
      {isError && (
        <ErrorBlock
          message={extractApiError(error)}
          onRetry={() => refetch()}
        />
      )}
      {data && <DashboardContent data={data} />}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  tone: "indigo" | "rose" | "amber" | "emerald";
}) {
  const toneStyles = {
    indigo: "bg-indigo-50 text-indigo-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  }[tone];
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${toneStyles}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-3xl font-semibold tabular-nums text-slate-900">
        {value}
      </div>
    </div>
  );
}

function DashboardContent({ data }: { data: DashboardData }) {
  const t = data.totals ?? { students: 0, atRisk: 0, red: 0, yellow: 0 };
  const finance = useQuery({ queryKey: ["finance-summary"], queryFn: getFinanceSummary });
  const debtors = useQuery({ queryKey: ["debtors"], queryFn: getDebtors });
  const leads = useQuery({ queryKey: ["leads"], queryFn: listLeads, enabled: LEADS_ENABLED });
  const lessons = useQuery({ queryKey: ["lessons"], queryFn: () => listLessons() });

  const leadCounts = STAGE_OPTIONS.map((s) => ({
    ...s,
    count: (leads.data ?? []).filter((l) => l.stage === s.key).length,
  }));
  const topDebtors = (debtors.data ?? []).slice(0, 5);
  const upcoming = (lessons.data ?? []).slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Jami talabalar" value={t.students ?? 0} icon={Users} tone="indigo" />
        <KpiCard label="Xavf ostida" value={t.atRisk ?? 0} icon={AlertTriangle} tone="amber" />
        <KpiCard
          label="Bugungi tushum"
          value={money(finance.data?.todayIncome ?? 0)}
          icon={TrendingUp}
          tone="emerald"
        />
        <KpiCard
          label="Umumiy qarz"
          value={money(finance.data?.totalDebt ?? 0)}
          icon={Wallet}
          tone="rose"
        />
      </div>

      <div className={`grid grid-cols-1 gap-4 ${LEADS_ENABLED ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        {LEADS_ENABLED && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Target className="h-4 w-4 text-indigo-600" /> Lidlar voronkasi
            </h2>
            <Link to="/leads" className="text-xs text-indigo-600 hover:underline">
              Barchasi →
            </Link>
          </div>
          <ul className="space-y-2.5">
            {leadCounts.map((s) => (
              <li key={s.key} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{s.label}</span>
                <span className="tabular-nums font-medium text-slate-900">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Wallet className="h-4 w-4 text-rose-600" /> Qarzdorlar
            </h2>
            <Link to="/finance" className="text-xs text-indigo-600 hover:underline">
              Moliya →
            </Link>
          </div>
          {topDebtors.length ? (
            <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {topDebtors.map((d) => (
                <li key={d.studentId}>
                  <Link
                    to="/students/$id"
                    params={{ id: d.studentId }}
                    className="flex items-center justify-between py-2 text-sm hover:bg-slate-50 -mx-2 px-2 rounded-md"
                  >
                    <span className="text-slate-800 truncate">{d.name}</span>
                    <span className="tabular-nums font-medium text-rose-700 shrink-0">
                      {money(d.balance)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBlock title="Qarzdor yo'q" />
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CalendarDays className="h-4 w-4 text-sky-600" /> Yaqin darslar
            </h2>
            <Link to="/schedule" className="text-xs text-indigo-600 hover:underline">
              Jadval →
            </Link>
          </div>
          {upcoming.length ? (
            <ul className="space-y-2">
              {upcoming.map((l) => (
                <li key={l.id} className="flex items-center gap-3 text-sm">
                  <span className="text-xs tabular-nums text-slate-500 shrink-0 w-24">
                    {l.date}
                    {l.startTime ? ` ${l.startTime}` : ""}
                  </span>
                  <span className="text-slate-800 truncate">{l.topic || "Dars"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBlock title="Dars yo'q" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            Motivatsiya trendi
          </h2>
          {data.motivationTrend?.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.motivationTrend}>
                  <defs>
                    <linearGradient id="mot" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 5]} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    fill="url(#mot)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyBlock title="Trend uchun ma'lumot yo'q" />
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            Keng tarqalgan to'siqlar
          </h2>
          {data.topObstacles?.length ? (
            <ul className="space-y-3">
              {data.topObstacles.map((o) => (
                <li
                  key={o.label}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-700">{o.label}</span>
                  <span className="tabular-nums font-medium text-slate-900">
                    {o.count}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBlock title="To'siqlar topilmadi" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            Guruhlar bo'yicha xavf
          </h2>
          {data.groupsByRisk?.length ? (
            <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {data.groupsByRisk.map((g) => (
                <li key={g.group} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium text-slate-900">{g.group}</span>
                  <div className="flex items-center gap-4 text-slate-600">
                    <span className="tabular-nums">
                      O'rtacha: {(g.avgRisk ?? 0).toFixed(1)}
                    </span>
                    <span className="tabular-nums text-rose-600">
                      Qizil: {g.redCount ?? 0}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBlock title="Guruhlar topilmadi" />
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            Eng xavfli talabalar
          </h2>
          {data.riskiestStudents?.length ? (
            <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {data.riskiestStudents.map((s) => (
                <li key={s.id}>
                  <Link
                    to="/students/$id"
                    params={{ id: s.id }}
                    className="flex items-center justify-between py-2.5 text-sm hover:bg-slate-50 -mx-2 px-2 rounded-md"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">
                        {s.fullName}
                      </span>
                      {s.group && (
                        <span className="text-xs text-slate-500">{s.group}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs tabular-nums text-slate-500">
                        {(s.riskScore ?? 0).toFixed(0)}
                      </span>
                      <RiskBadge level={s.riskLevel} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBlock title="Talabalar topilmadi" />
          )}
        </div>
      </div>
    </div>
  );
}