import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { extractApiError } from "@/lib/api";
import {
  deleteLesson,
  listGroups,
  listLessons,
  listRooms,
  listTeachers,
  type Lesson,
} from "@/lib/resources";
import { PageHeader } from "@/components/PageHeader";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { Button } from "@/components/ui/button";
import { LESSON_STATUS, LessonDialog } from "@/features/lessons/LessonDialog";
import { AttendanceRoster } from "@/features/lessons/AttendanceRoster";

export const Route = createFileRoute("/_authenticated/schedule/")({
  head: () => ({ meta: [{ title: "Jadval — Staydy" }] }),
  component: SchedulePage,
});

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-sky-50 text-sky-700",
  done: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-700",
};
const statusLabel = (k: string) => LESSON_STATUS.find((s) => s.key === k)?.label ?? k;
const todayISO = () => new Date().toISOString().slice(0, 10);

function SchedulePage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [rosterLesson, setRosterLesson] = useState<Lesson | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["lessons"],
    queryFn: () => listLessons(),
  });
  const groups = useQuery({ queryKey: ["groups"], queryFn: listGroups });
  const teachers = useQuery({ queryKey: ["teachers"], queryFn: listTeachers });
  const rooms = useQuery({ queryKey: ["rooms"], queryFn: listRooms });
  const groupName = (id?: string) => groups.data?.find((g) => g.id === id)?.name;
  const teacherName = (id?: string) => teachers.data?.find((t) => t.id === id)?.fullName;
  const roomName = (l: Lesson) => rooms.data?.find((r) => r.id === l.roomId)?.name || l.room;

  const del = useMutation({
    mutationFn: (id: string) => deleteLesson(id),
    onSuccess: () => {
      toast.success("Dars o'chirildi");
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const lessons = data ?? [];
  // Group by date, preserving the backend's ascending date/time order.
  const byDate = useMemo(() => {
    const m = new Map<string, Lesson[]>();
    for (const l of lessons) {
      const arr = m.get(l.date);
      if (arr) arr.push(l);
      else m.set(l.date, [l]);
    }
    return Array.from(m.entries());
  }, [lessons]);

  return (
    <div>
      <PageHeader
        title="Jadval"
        description="Dars jadvali (keyingi 30 kun)"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Yangi dars
          </Button>
        }
      />

      {isLoading && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <LoadingBlock />
        </div>
      )}
      {isError && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <ErrorBlock message={extractApiError(error)} onRetry={() => refetch()} />
        </div>
      )}
      {!isLoading && !isError && lessons.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <EmptyBlock title="Dars yo'q" description="Yangi dars qo'shing" />
        </div>
      )}

      {!isLoading &&
        !isError &&
        byDate.map(([date, items]) => (
          <div key={date} className="mb-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">{date}</h3>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
              {items.map((l) => (
                <div key={l.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-24 shrink-0 text-sm tabular-nums text-slate-700">
                    {l.startTime || "—"}
                    {l.endTime ? `–${l.endTime}` : ""}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {l.topic || groupName(l.groupId) || "Dars"}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                      {[groupName(l.groupId), teacherName(l.teacherId), roomName(l)]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLE[l.status] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {statusLabel(l.status)}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {l.groupId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setRosterLesson(l)}
                      >
                        Davomat
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(l);
                        setDialogOpen(true);
                      }}
                      className="text-slate-500 hover:text-indigo-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={del.isPending}
                      onClick={() => {
                        if (window.confirm("Darsni o'chirasizmi?")) del.mutate(l.id);
                      }}
                      className="text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

      <LessonDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        lesson={editing}
        defaultDate={todayISO()}
      />
      <AttendanceRoster
        open={!!rosterLesson}
        onOpenChange={(o) => !o && setRosterLesson(null)}
        lesson={rosterLesson}
      />
    </div>
  );
}
