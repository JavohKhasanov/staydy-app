import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { extractApiError } from "@/lib/api";
import {
  createLesson,
  listGroups,
  listRooms,
  listTeachers,
  updateLesson,
  type Lesson,
} from "@/lib/resources";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

export const LESSON_STATUS = [
  { key: "scheduled", label: "Rejalashtirilgan" },
  { key: "done", label: "O'tkazilgan" },
  { key: "cancelled", label: "Bekor qilingan" },
];

type FormState = {
  groupId: string;
  teacherId: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  roomId: string;
  topic: string;
  status: string;
};

function fromLesson(l: Lesson | null, defaultDate: string): FormState {
  if (!l)
    return {
      groupId: "",
      teacherId: "",
      date: defaultDate,
      startTime: "",
      endTime: "",
      room: "",
      roomId: "",
      topic: "",
      status: "scheduled",
    };
  return {
    groupId: l.groupId ?? "",
    teacherId: l.teacherId ?? "",
    date: l.date,
    startTime: l.startTime ?? "",
    endTime: l.endTime ?? "",
    room: l.room ?? "",
    roomId: l.roomId ?? "",
    topic: l.topic ?? "",
    status: l.status,
  };
}

export function LessonDialog({
  open,
  onOpenChange,
  lesson,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lesson: Lesson | null;
  defaultDate: string;
}) {
  const isEdit = !!lesson;
  const [form, setForm] = useState<FormState>(() => fromLesson(lesson, defaultDate));
  const queryClient = useQueryClient();
  const groups = useQuery({ queryKey: ["groups"], queryFn: listGroups });
  const teachers = useQuery({ queryKey: ["teachers"], queryFn: listTeachers });
  const rooms = useQuery({ queryKey: ["rooms"], queryFn: listRooms });

  useEffect(() => {
    if (open) setForm(fromLesson(lesson, defaultDate));
  }, [open, lesson, defaultDate]);

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        groupId: form.groupId || undefined,
        teacherId: form.teacherId || undefined,
        date: form.date,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        room: form.room || undefined,
        roomId: form.roomId || undefined,
        topic: form.topic || undefined,
        status: form.status,
      };
      return isEdit && lesson ? updateLesson(lesson.id, body) : createLesson(body);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Yangilandi" : "Dars qo'shildi");
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Darsni tahrirlash" : "Yangi dars"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (form.date) mutation.mutate();
          }}
          className="grid grid-cols-1 gap-4"
        >
          <div className="grid grid-cols-3 gap-4">
            <F label="Sana" required>
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
            </F>
            <F label="Boshlanish">
              <Input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
            </F>
            <F label="Tugash">
              <Input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
            </F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Guruh">
              <Select value={form.groupId || NONE} onValueChange={(v) => set("groupId", v === NONE ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {(groups.data ?? []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
            <F label="Ustoz">
              <Select
                value={form.teacherId || NONE}
                onValueChange={(v) => set("teacherId", v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {(teachers.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Xona">
              {(rooms.data?.length ?? 0) > 0 ? (
                <Select
                  value={form.roomId || NONE}
                  onValueChange={(v) => set("roomId", v === NONE ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {(rooms.data ?? []).map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.room} onChange={(e) => set("room", e.target.value)} placeholder="A-12" />
              )}
            </F>
            <F label="Holat">
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LESSON_STATUS.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
          </div>
          <F label="Mavzu">
            <Input value={form.topic} onChange={(e) => set("topic", e.target.value)} />
          </F>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Bekor qilish
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Saqlash
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function F({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </Label>
      {children}
    </div>
  );
}
