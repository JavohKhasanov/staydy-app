import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Users } from "lucide-react";

import { extractApiError } from "@/lib/api";
import { listMyGroups, listMyStudents } from "@/lib/resources";
import { normalizeRisk } from "@/components/RiskBadge";
import { PageHeader } from "@/components/PageHeader";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";

export const Route = createFileRoute("/_authenticated/me/groups/")({
  head: () => ({ meta: [{ title: "Mening guruhlarim — Staydy" }] }),
  component: MyGroupsPage,
});

// Teacher's own groups (/me/groups). Per-group counts are derived client-side from /me/students
// because the per-group students endpoint is center_admin-gated and 403s for teachers.
function MyGroupsPage() {
  const groupsQ = useQuery({ queryKey: ["me", "groups"], queryFn: listMyGroups });
  const studentsQ = useQuery({ queryKey: ["me", "students"], queryFn: listMyStudents });

  const isLoading = groupsQ.isLoading || studentsQ.isLoading;
  const isError = groupsQ.isError || studentsQ.isError;
  const groups = groupsQ.data ?? [];
  const students = studentsQ.data ?? [];

  const statsFor = (groupName: string) => {
    const inGroup = students.filter((s) => s.group === groupName);
    return {
      total: inGroup.length,
      red: inGroup.filter((s) => normalizeRisk(s.riskLevel) === "red").length,
      yellow: inGroup.filter((s) => normalizeRisk(s.riskLevel) === "yellow").length,
      green: inGroup.filter((s) => normalizeRisk(s.riskLevel) === "green").length,
    };
  };

  return (
    <div>
      <PageHeader title="Mening guruhlarim" description="Sizga biriktirilgan guruhlar" />

      {isLoading && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <LoadingBlock />
        </div>
      )}
      {isError && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <ErrorBlock
            message={extractApiError(groupsQ.error ?? studentsQ.error)}
            onRetry={() => {
              groupsQ.refetch();
              studentsQ.refetch();
            }}
          />
        </div>
      )}
      {!isLoading && !isError && groups.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <EmptyBlock title="Guruh biriktirilmagan" />
        </div>
      )}
      {!isLoading && !isError && groups.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => {
            const st = statsFor(g.name);
            return (
              <div
                key={g.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{g.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {[g.direction, g.scheduleDays].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-sm text-slate-600">
                  <Users className="h-4 w-4 text-slate-400" />
                  {st.total} talaba
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                  <span className="rounded-full bg-rose-50 text-rose-700 px-2 py-0.5">
                    Qizil {st.red}
                  </span>
                  <span className="rounded-full bg-amber-50 text-amber-700 px-2 py-0.5">
                    Sariq {st.yellow}
                  </span>
                  <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5">
                    Yashil {st.green}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
