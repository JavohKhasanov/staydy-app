import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { extractApiError } from "@/lib/api";
import { deleteCourse, listCourses, updateCourse, type Course } from "@/lib/resources";
import { PageHeader } from "@/components/PageHeader";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { Button } from "@/components/ui/button";
import { CourseDialog } from "@/features/courses/CourseDialog";

export const Route = createFileRoute("/_authenticated/courses/")({
  head: () => ({ meta: [{ title: "Kurslar — Staydy" }] }),
  component: CoursesPage,
});

function formatPrice(p: number): string {
  return p > 0 ? `${p.toLocaleString("ru-RU")} so'm` : "—";
}

function CoursesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["courses"],
    queryFn: listCourses,
  });
  const courses = data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["courses"] });

  const toggle = useMutation({
    mutationFn: (c: Course) =>
      updateCourse(c.id, {
        name: c.name,
        level: c.level,
        price: c.price,
        durationWeeks: c.durationWeeks,
        description: c.description,
        isActive: !c.isActive,
      }),
    onSuccess: invalidate,
    onError: (err) => toast.error(extractApiError(err)),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteCourse(id),
    onSuccess: () => {
      toast.success("Kurs o'chirildi");
      invalidate();
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (c: Course) => {
    setEditing(c);
    setDialogOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Kurslar"
        description="Markazingiz taklif qiladigan kurslar va narxlar"
        actions={
          <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" />
            Yangi kurs
          </Button>
        }
      />
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading && <LoadingBlock />}
        {isError && <ErrorBlock message={extractApiError(error)} onRetry={() => refetch()} />}
        {!isLoading && !isError && courses.length === 0 && (
          <EmptyBlock title="Kurslar yo'q" description="Birinchi kursingizni qo'shing" />
        )}
        {!isLoading && !isError && courses.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Nomi</th>
                  <th className="px-4 py-3 font-medium">Daraja</th>
                  <th className="px-4 py-3 font-medium text-right">Narx</th>
                  <th className="px-4 py-3 font-medium text-right">Davomiyligi</th>
                  <th className="px-4 py-3 font-medium">Holat</th>
                  <th className="px-4 py-3 font-medium text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map((c) => (
                  <tr key={c.id} className={`hover:bg-slate-50 ${!c.isActive ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 text-slate-600">{c.level || "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatPrice(c.price)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {c.durationWeeks ? `${c.durationWeeks} hafta` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {c.isActive ? (
                        <span className="inline-flex rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs font-medium">
                          Faol
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-xs font-medium">
                          Arxiv
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(c)}
                          className="text-slate-500 hover:text-indigo-600"
                          title="Tahrirlash"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={toggle.isPending}
                          onClick={() => toggle.mutate(c)}
                          className="text-slate-500 hover:text-amber-600"
                          title={c.isActive ? "Arxivlash" : "Tiklash"}
                        >
                          {c.isActive ? (
                            <Archive className="h-4 w-4" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={del.isPending}
                          onClick={() => {
                            if (window.confirm(`"${c.name}" kursini butunlay o'chirasizmi?`))
                              del.mutate(c.id);
                          }}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          title="O'chirish"
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
      <CourseDialog open={dialogOpen} onOpenChange={setDialogOpen} course={editing} />
    </div>
  );
}
