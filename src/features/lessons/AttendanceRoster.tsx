import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { extractApiError } from "@/lib/api";
import { listGroupStudents, recordAttendance, type Lesson } from "@/lib/resources";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Per-student status options. late/excused count as attended server-side (is_present derived),
// so they don't lower the risk-facing attendance rate.
const OPTS = [
  { v: "PRESENT", label: "Keldi", on: "bg-emerald-600 text-white" },
  { v: "LATE", label: "Kechikdi", on: "bg-amber-500 text-white" },
  { v: "EXCUSED", label: "Sababli", on: "bg-sky-500 text-white" },
  { v: "ABSENT", label: "Kelmadi", on: "bg-rose-600 text-white" },
];

// AttendanceRoster marks a whole group's attendance for a lesson in one screen
// (present/late/excused/absent), saving via the existing per-student endpoint.
export function AttendanceRoster({
  open,
  onOpenChange,
  lesson,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lesson: Lesson | null;
}) {
  const queryClient = useQueryClient();
  const [marks, setMarks] = useState<Record<string, string>>({});

  const students = useQuery({
    queryKey: ["group-students", lesson?.groupId],
    queryFn: () => listGroupStudents(lesson!.groupId!),
    enabled: !!lesson?.groupId && open,
  });

  // Default everyone to present when the roster opens.
  useEffect(() => {
    if (open && students.data) {
      const m: Record<string, string> = {};
      students.data.forEach((s) => (m[s.id] = "PRESENT"));
      setMarks(m);
    }
  }, [open, students.data]);

  const save = useMutation({
    mutationFn: async () => {
      const list = students.data ?? [];
      await Promise.all(
        list.map((s) =>
          recordAttendance(s.id, {
            date: lesson!.date,
            status: marks[s.id] ?? "PRESENT",
          }),
        ),
      );
    },
    onSuccess: () => {
      toast.success("Davomat saqlandi");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const list = students.data ?? [];
  const presentCount = list.filter((s) => (marks[s.id] ?? "PRESENT") !== "ABSENT").length;
  const setAll = (v: string) => setMarks(Object.fromEntries(list.map((s) => [s.id, v])));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Davomat</DialogTitle>
          <DialogDescription>
            {lesson?.date}
            {lesson?.startTime ? ` · ${lesson.startTime}` : ""}
            {lesson?.topic ? ` · ${lesson.topic}` : ""}
          </DialogDescription>
        </DialogHeader>

        {students.isLoading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Yuklanmoqda...</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            Bu guruhda talaba yo'q (yoki guruh biriktirilmagan).
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>
                {presentCount}/{list.length} keldi
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAll("PRESENT")}
                  className="text-emerald-700 hover:underline"
                >
                  Hammasi keldi
                </button>
                <button
                  type="button"
                  onClick={() => setAll("ABSENT")}
                  className="text-rose-600 hover:underline"
                >
                  Hammasi kelmadi
                </button>
              </div>
            </div>
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {list.map((s) => {
                const cur = marks[s.id] ?? "PRESENT";
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                      {s.fullName}
                    </span>
                    <div className="flex shrink-0 gap-1">
                      {OPTS.map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          onClick={() => setMarks((m) => ({ ...m, [s.id]: o.v }))}
                          className={`rounded-md px-2 py-1 text-xs font-medium ${
                            cur === o.v ? o.on : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Yopish
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || list.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
