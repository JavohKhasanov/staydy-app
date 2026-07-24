import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, UserMinus, ShieldAlert, CheckCircle2 } from "lucide-react";

import { extractApiError } from "@/lib/api";
import { getRetention } from "@/lib/resources";
import { PageHeader } from "@/components/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/StateBlocks";

export const Route = createFileRoute("/_authenticated/retention/")({
  head: () => ({ meta: [{ title: "Ushlab qolish — Staydy" }] }),
  component: RetentionPage,
});

const pct = (n: number) => `${Math.round(n * 100)}%`;

function RetentionPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["retention"],
    queryFn: getRetention,
  });

  return (
    <div>
      <PageHeader title="Ushlab qolish" subtitle="Retention, xavf tahlili va intervention samaradorligi" />

      {isLoading && <LoadingBlock />}
      {isError && <ErrorBlock message={extractApiError(error)} onRetry={() => refetch()} />}

      {data && (
        <div className="space-y-6">
          {/* KPI tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile
              icon={<TrendingUp className="h-4 w-4" />}
              label="Retention"
              value={pct(data.retentionRate)}
              accent="text-emerald-600"
              hint={`${data.active} faol / ${data.dropped} ketgan`}
            />
            <Tile
              icon={<ShieldAlert className="h-4 w-4" />}
              label="Xavf ostida"
              value={String(data.yellow + data.red)}
              accent="text-amber-600"
              hint={`${data.red} qizil · ${data.yellow} sariq`}
            />
            <Tile
              icon={<UserMinus className="h-4 w-4" />}
              label="Ketganlar"
              value={String(data.dropped)}
              accent="text-rose-600"
              hint={`${data.total} umumiy`}
            />
            <Tile
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Hal qilingan (30 kun)"
              value={String(data.interventions.resolved30d)}
              accent="text-indigo-600"
              hint={`${data.interventions.open} ochiq`}
            />
          </div>

          {/* Risk mix */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Xavf taqsimoti (faol o'quvchilar)</h2>
            <RiskBar green={data.green} yellow={data.yellow} red={data.red} />
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
              <Legend color="bg-emerald-500" label="Yashil" n={data.green} />
              <Legend color="bg-amber-500" label="Sariq" n={data.yellow} />
              <Legend color="bg-rose-500" label="Qizil" n={data.red} />
            </div>
          </div>

          {/* Cohorts */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Cohort ushlab qolish (qo'shilgan oy bo'yicha)</h2>
            </div>
            {data.cohorts.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">Ma'lumot yo'q.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Oy</th>
                    <th className="px-5 py-2.5 font-medium text-right">Jami</th>
                    <th className="px-5 py-2.5 font-medium text-right">Faol</th>
                    <th className="px-5 py-2.5 font-medium text-right">Ketgan</th>
                    <th className="px-5 py-2.5 font-medium text-right">Retention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.cohorts.map((c) => (
                    <tr key={c.month} className="hover:bg-slate-50">
                      <td className="px-5 py-2.5 font-medium text-slate-800">{c.month}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-slate-600">{c.total}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-emerald-700">{c.active}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-rose-600">{c.dropped}</td>
                      <td className="px-5 py-2.5 text-right">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            c.retentionRate >= 0.8
                              ? "bg-emerald-50 text-emerald-700"
                              : c.retentionRate >= 0.6
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {pct(c.retentionRate)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Intervention effectiveness */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Intervention samaradorligi</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
              <Mini label="Ochiq" value={String(data.interventions.open)} />
              <Mini label="Hal qilingan" value={String(data.interventions.resolved)} />
              <Mini label="30 kun ichida" value={String(data.interventions.resolved30d)} />
              <Mini
                label="O'rtacha hal qilish"
                value={`${data.interventions.avgResolveDays.toFixed(1)} kun`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  accent,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex items-center gap-1.5 text-xs font-medium text-slate-500`}>
        <span className={accent}>{icon}</span>
        {label}
      </div>
      <div className={`mt-1.5 text-2xl font-bold ${accent}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

function RiskBar({ green, yellow, red }: { green: number; yellow: number; red: number }) {
  const total = green + yellow + red || 1;
  return (
    <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="bg-emerald-500" style={{ width: `${(green / total) * 100}%` }} />
      <div className="bg-amber-500" style={{ width: `${(yellow / total) * 100}%` }} />
      <div className="bg-rose-500" style={{ width: `${(red / total) * 100}%` }} />
    </div>
  );
}

function Legend({ color, label, n }: { color: string; label: string; n: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}: <span className="font-semibold text-slate-800">{n}</span>
    </span>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-lg font-bold text-slate-900">{value}</div>
    </div>
  );
}
