import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import {
  getFinanceSummary,
  listGroups,
  listLeads,
  listStudents,
  listTeachers,
} from "@/lib/resources";
import { money } from "@/features/students/FinanceSection";
import { STAGE_OPTIONS } from "@/features/leads/LeadDialog";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/reports/")({
  head: () => ({ meta: [{ title: "Hisobotlar — Staydy" }] }),
  component: ReportsPage,
});

const RISK = [
  { key: "Green", label: "Yashil", bar: "bg-emerald-500", text: "text-emerald-700" },
  { key: "Yellow", label: "Sariq", bar: "bg-amber-500", text: "text-amber-700" },
  { key: "Red", label: "Qizil", bar: "bg-rose-500", text: "text-rose-700" },
];

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function ReportsPage() {
  const students = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const groups = useQuery({ queryKey: ["groups"], queryFn: listGroups });
  const leads = useQuery({ queryKey: ["leads"], queryFn: listLeads });
  const teachers = useQuery({ queryKey: ["teachers"], queryFn: listTeachers });
  const finance = useQuery({ queryKey: ["finance", "summary"], queryFn: getFinanceSummary });

  const s = students.data ?? [];
  const g = groups.data ?? [];
  const l = leads.data ?? [];
  const t = teachers.data ?? [];

  // Risk distribution
  const riskCounts = useMemo(() => {
    const m: Record<string, number> = { Green: 0, Yellow: 0, Red: 0 };
    for (const st of s) m[st.riskLevel ?? "Green"] = (m[st.riskLevel ?? "Green"] ?? 0) + 1;
    return m;
  }, [s]);

  // Lead funnel + conversion
  const stageCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const ld of l) m[ld.stage] = (m[ld.stage] ?? 0) + 1;
    return m;
  }, [l]);
  const conversion = pct(stageCounts["enrolled"] ?? 0, l.length);

  // Group fill (students per group / capacity)
  const groupFill = useMemo(() => {
    return g
      .map((grp) => {
        const count = s.filter((st) => st.groupId === grp.id).length;
        const cap = grp.capacity ?? 0;
        return { id: grp.id, name: grp.name, count, cap, fill: cap > 0 ? pct(count, cap) : 0 };
      })
      .sort((a, b) => b.count - a.count);
  }, [g, s]);

  // Teacher load (groups taught + students in them)
  const teacherLoad = useMemo(() => {
    return t
      .map((tc) => {
        const tGroups = g.filter((grp) => grp.teacherId === tc.id);
        const gids = new Set(tGroups.map((grp) => grp.id));
        const sCount = s.filter((st) => st.groupId && gids.has(st.groupId)).length;
        return { id: tc.id, name: tc.fullName, groups: tGroups.length, students: sCount };
      })
      .sort((a, b) => b.students - a.students);
  }, [t, g, s]);

  const loading = students.isLoading || groups.isLoading || leads.isLoading || teachers.isLoading;

  return (
    <div>
      <PageHeader title="Hisobotlar" description="Markaz ko'rsatkichlari — bir qarashda" />

      {/* Finance KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-5">
        <Kpi label="Oylik tushum" value={money(finance.data?.monthIncome ?? 0)} tint="text-emerald-700" />
        <Kpi label="Oylik xarajat" value={money(finance.data?.monthExpense ?? 0)} tint="text-rose-700" />
        <Kpi
          label="Oylik foyda"
          value={money(finance.data?.monthProfit ?? 0)}
          tint={(finance.data?.monthProfit ?? 0) >= 0 ? "text-indigo-700" : "text-rose-700"}
        />
        <Kpi label="Umumiy qarz" value={money(finance.data?.totalDebt ?? 0)} tint="text-amber-700" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Lead conversion */}
        <Card title="Lidlar konversiyasi" hint={`${conversion}% yozildi`}>
          {l.length === 0 ? (
            <Empty text="Lid yo'q" />
          ) : (
            <div className="space-y-2.5">
              {STAGE_OPTIONS.map((st) => {
                const c = stageCounts[st.key] ?? 0;
                return <Bar key={st.key} label={st.label} value={c} max={l.length} bar="bg-indigo-500" />;
              })}
            </div>
          )}
        </Card>

        {/* Risk distribution */}
        <Card title="Xavf taqsimoti" hint={`${s.length} talaba`}>
          {s.length === 0 ? (
            <Empty text="Talaba yo'q" />
          ) : (
            <div className="space-y-2.5">
              {RISK.map((r) => (
                <Bar
                  key={r.key}
                  label={`${r.label} (${pct(riskCounts[r.key] ?? 0, s.length)}%)`}
                  value={riskCounts[r.key] ?? 0}
                  max={s.length}
                  bar={r.bar}
                  labelClass={r.text}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Group fill */}
        <Card title="Guruh to'ldirilishi" hint={`${g.length} guruh`}>
          {groupFill.length === 0 ? (
            <Empty text="Guruh yo'q" />
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {groupFill.map((gr) => (
                <div key={gr.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 truncate">{gr.name}</span>
                    <span className="text-slate-500 tabular-nums text-xs">
                      {gr.count}
                      {gr.cap > 0 ? `/${gr.cap}` : ""} {gr.cap > 0 ? `· ${gr.fill}%` : ""}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${gr.fill >= 90 ? "bg-rose-500" : gr.fill >= 60 ? "bg-emerald-500" : "bg-sky-400"}`}
                      style={{ width: `${Math.min(gr.cap > 0 ? gr.fill : gr.count > 0 ? 100 : 0, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Teacher load */}
        <Card title="Ustozlar yuki" hint={`${t.length} ustoz`}>
          {teacherLoad.length === 0 ? (
            <Empty text="Ustoz yo'q" />
          ) : (
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {teacherLoad.map((tc) => (
                <div key={tc.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-700 truncate">{tc.name}</span>
                  <span className="text-slate-500 text-xs tabular-nums">
                    {tc.groups} guruh · {tc.students} talaba
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {loading && <div className="mt-4 h-2 w-full animate-pulse rounded bg-slate-100" />}
    </div>
  );
}

function Kpi({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tint}`}>{value}</div>
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-medium text-slate-700">{title}</div>
        {hint && <div className="text-xs text-slate-400">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  bar,
  labelClass,
}: {
  label: string;
  value: number;
  max: number;
  bar: string;
  labelClass?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className={labelClass ?? "text-slate-700"}>{label}</span>
        <span className="text-slate-500 tabular-nums text-xs">{value}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct(value, max)}%` }} />
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="py-6 text-center text-sm text-slate-400">{text}</div>;
}
