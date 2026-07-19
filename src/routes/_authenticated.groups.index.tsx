import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { extractApiError } from "@/lib/api";
import { deleteGroup, listCourses, listGroups, listRooms, listTeachers } from "@/lib/resources";
import type { Group } from "@/lib/types";
import { daysLabel, matchesParity } from "@/lib/weekdays";
import { useBranch } from "@/features/branches/BranchContext";
import { PageHeader } from "@/components/PageHeader";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { Button } from "@/components/ui/button";
import { NewGroupDialog } from "@/features/groups/NewGroupDialog";
import { GroupDialog } from "@/features/groups/GroupDialog";

export const Route = createFileRoute("/_authenticated/groups/")({
  head: () => ({ meta: [{ title: "Guruhlar — Staydy" }] }),
  component: GroupsPage,
});

type Parity = "all" | "odd" | "even";
const PARITY_TABS: { value: Parity; label: string }[] = [
  { value: "all", label: "Barchasi" },
  { value: "odd", label: "Toq kunlar" },
  { value: "even", label: "Juft kunlar" },
];

function GroupsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Group | null>(null);
  const [parity, setParity] = useState<Parity>("all");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["groups"],
    queryFn: listGroups,
  });
  const teachers = useQuery({ queryKey: ["teachers"], queryFn: listTeachers });
  const teacherName = (id?: string) => teachers.data?.find((t) => t.id === id)?.fullName ?? "—";
  const courses = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const courseName = (id?: string) => courses.data?.find((c) => c.id === id)?.name ?? "—";
  const rooms = useQuery({ queryKey: ["rooms"], queryFn: listRooms });
  const roomName = (id?: string) => rooms.data?.find((r) => r.id === id)?.name ?? "—";

  const del = useMutation({
    mutationFn: (id: string) => deleteGroup(id),
    onSuccess: () => {
      toast.success("Guruh o'chirildi");
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const { branchId } = useBranch();
  const groups = (data ?? [])
    .filter((g) => !branchId || g.branchId === branchId)
    .filter((g) => parity === "all" || matchesParity(g.scheduleDays, parity));

  const timeLabel = (g: Group) => (g.startTime ? `${g.startTime}${g.endTime ? `–${g.endTime}` : ""}` : "—");

  return (
    <div>
      <PageHeader title="Guruhlar" description="Guruhlar, jadvali va ustozlari" actions={<NewGroupDialog />} />

      <div className="mb-4 flex flex-wrap gap-2">
        {PARITY_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setParity(t.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              parity === t.value
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading && <LoadingBlock />}
        {isError && <ErrorBlock message={extractApiError(error)} onRetry={() => refetch()} />}
        {!isLoading && !isError && groups.length === 0 && (
          <EmptyBlock title="Guruhlar topilmadi" description="Yangi guruh qo'shing" />
        )}
        {!isLoading && !isError && groups.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Nomi</th>
                  <th className="px-4 py-3 font-medium">Ustoz</th>
                  <th className="px-4 py-3 font-medium">Kurs</th>
                  <th className="px-4 py-3 font-medium">Kunlar</th>
                  <th className="px-4 py-3 font-medium">Vaqt</th>
                  <th className="px-4 py-3 font-medium">Xona</th>
                  <th className="px-4 py-3 font-medium text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        to="/groups/$id"
                        params={{ id: g.id }}
                        className="font-medium text-slate-900 hover:text-indigo-600"
                      >
                        {g.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{teacherName(g.teacherId)}</td>
                    <td className="px-4 py-3">
                      {g.courseId ? (
                        <Link to="/courses" className="text-slate-600 hover:text-indigo-600">
                          {courseName(g.courseId)}
                        </Link>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{daysLabel(g.scheduleDays)}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">{timeLabel(g)}</td>
                    <td className="px-4 py-3 text-slate-600">{g.roomId ? roomName(g.roomId) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-500 hover:text-indigo-600"
                          onClick={() => setEditing(g)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          disabled={del.isPending}
                          onClick={() => {
                            if (window.confirm(`"${g.name}" guruhini o'chirasizmi? Talabalar guruhdan chiqariladi.`))
                              del.mutate(g.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <GroupDialog open onOpenChange={(o) => !o && setEditing(null)} group={editing} />
      )}
    </div>
  );
}
