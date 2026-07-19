import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { extractApiError } from "@/lib/api";
import { createGroup, updateGroup, listBranches, listCourses, listRooms, listTeachers } from "@/lib/resources";
import type { Group } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { WeekdayPicker } from "./WeekdayPicker";

type FormState = {
  name: string;
  teacherId: string;
  courseId: string;
  branchId: string;
  roomId: string;
  direction: string;
  scheduleDays: string;
  startTime: string;
  endTime: string;
  capacity: string;
};

function fromGroup(g?: Group): FormState {
  return {
    name: g?.name ?? "",
    teacherId: g?.teacherId ?? "",
    courseId: g?.courseId ?? "",
    branchId: g?.branchId ?? "",
    roomId: g?.roomId ?? "",
    direction: g?.direction ?? "",
    scheduleDays: g?.scheduleDays ?? "",
    startTime: g?.startTime ?? "",
    endTime: g?.endTime ?? "",
    capacity: g?.capacity != null ? String(g.capacity) : "",
  };
}

// GroupDialog is the create + edit form for a group. Pass a `group` to edit; omit it to create.
export function GroupDialog({
  open,
  onOpenChange,
  group,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  group?: Group;
}) {
  const isEdit = !!group;
  const [form, setForm] = useState<FormState>(() => fromGroup(group));
  const queryClient = useQueryClient();
  const teachers = useQuery({ queryKey: ["teachers"], queryFn: listTeachers });
  const courses = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const branches = useQuery({ queryKey: ["branches"], queryFn: listBranches });
  const rooms = useQuery({ queryKey: ["rooms"], queryFn: listRooms });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        teacherId: form.teacherId || undefined,
        courseId: form.courseId || undefined,
        branchId: form.branchId || undefined,
        roomId: form.roomId || undefined,
        direction: form.direction || undefined,
        scheduleDays: form.scheduleDays || undefined,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      };
      if (isEdit) await updateGroup(group!.id, payload);
      else await createGroup(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Saqlandi" : "Guruh qo'shildi");
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["group"] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Guruhni tahrirlash" : "Yangi guruh"}</DialogTitle>
          <DialogDescription>Guruh vaqti va kunlari jadvalga o'tadi</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="grid grid-cols-1 gap-4"
        >
          <Field label="Guruh nomi" required>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="Masalan: IELTS-4" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ustoz">
              <Select value={form.teacherId} onValueChange={(v) => set("teacherId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {(teachers.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Kurs">
              <Select value={form.courseId} onValueChange={(v) => set("courseId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {(courses.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Dars kunlari">
            <WeekdayPicker value={form.scheduleDays} onChange={(v) => set("scheduleDays", v)} />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Boshlanish">
              <Input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
            </Field>
            <Field label="Tugash">
              <Input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
            </Field>
            <Field label="Xona">
              <Select value={form.roomId} onValueChange={(v) => set("roomId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {(rooms.data ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Sig'im">
              <Input type="number" min="0" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="15" />
            </Field>
            <Field label="Yo'nalish">
              <Input value={form.direction} onChange={(e) => set("direction", e.target.value)} placeholder="IT" />
            </Field>
          </div>

          {(branches.data?.length ?? 0) > 0 && (
            <Field label="Filial">
              <Select value={form.branchId} onValueChange={(v) => set("branchId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {(branches.data ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Saqlash
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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
