import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { extractApiError } from "@/lib/api";
import { deleteGroup, listCourses, listGroups, listTeachers } from "@/lib/resources";
import { useBranch } from "@/features/branches/BranchContext";
import { PageHeader } from "@/components/PageHeader";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { Button } from "@/components/ui/button";
import { NewGroupDialog } from "@/features/groups/NewGroupDialog";

export const Route = createFileRoute("/_authenticated/groups/")({
  head: () => ({ meta: [{ title: "Guruhlar — Staydy" }] }),
  component: GroupsPage,
});

function GroupsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["groups"],
    queryFn: listGroups,
  });
  const teachers = useQuery({ queryKey: ["teachers"], queryFn: listTeachers });
  const teacherName = (id?: string) => teachers.data?.find((t) => t.id === id)?.fullName ?? "—";
  const courses = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const courseName = (id?: string) => courses.data?.find((c) => c.id === id)?.name ?? "—";

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
  const groups = (data ?? []).filter((g) => !branchId || g.branchId === branchId);

  return (
    <div>
      <PageHeader
        title="Guruhlar"
        description="Guruhlar va ularning ustozlari"
        actions={<NewGroupDialog />}
      />
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
                  <th className="px-4 py-3 font-medium">Yo'nalish</th>
                  <th className="px-4 py-3 font-medium">Dars kunlari</th>
                  <th className="px-4 py-3 font-medium text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{g.name}</td>
                    <td className="px-4 py-3 text-slate-600">{teacherName(g.teacherId)}</td>
                    <td className="px-4 py-3 text-slate-600">{courseName(g.courseId)}</td>
                    <td className="px-4 py-3 text-slate-600">{g.direction ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{g.scheduleDays ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        disabled={del.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `"${g.name}" guruhini o'chirasizmi? Talabalar guruhdan chiqariladi.`,
                            )
                          )
                            del.mutate(g.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
