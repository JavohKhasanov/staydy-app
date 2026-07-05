import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

import { extractApiError } from "@/lib/api";
import { createGroup, listBranches, listCourses, listTeachers } from "@/lib/resources";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

type FormState = {
  name: string;
  teacherId: string;
  courseId: string;
  branchId: string;
  direction: string;
  scheduleDays: string;
  capacity: string;
};
const initial: FormState = {
  name: "",
  teacherId: "",
  courseId: "",
  branchId: "",
  direction: "",
  scheduleDays: "",
  capacity: "",
};

export function NewGroupDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initial);
  const queryClient = useQueryClient();
  const teachers = useQuery({ queryKey: ["teachers"], queryFn: listTeachers });
  const courses = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const branches = useQuery({ queryKey: ["branches"], queryFn: listBranches });

  const mutation = useMutation({
    mutationFn: async () => {
      await createGroup({
        name: form.name,
        teacherId: form.teacherId || undefined,
        courseId: form.courseId || undefined,
        branchId: form.branchId || undefined,
        direction: form.direction || undefined,
        scheduleDays: form.scheduleDays || undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      });
    },
    onSuccess: () => {
      toast.success("Guruh qo'shildi");
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setForm(initial);
      setOpen(false);
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" />
          Yangi guruh
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Yangi guruh qo'shish</DialogTitle>
          <DialogDescription>Guruh ma'lumotlarini kiriting</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="grid grid-cols-1 gap-4"
        >
          <Field label="Guruh nomi" required>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              placeholder="Masalan: Matematika-1"
            />
          </Field>
          <Field label="Ustoz">
            <Select value={form.teacherId} onValueChange={(v) => set("teacherId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Tanlang (ixtiyoriy)" />
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
                <SelectValue placeholder="Tanlang (ixtiyoriy)" />
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
          {(branches.data?.length ?? 0) > 0 && (
            <Field label="Filial">
              <Select value={form.branchId} onValueChange={(v) => set("branchId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang (ixtiyoriy)" />
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
          <Field label="Sig'im (talaba soni)">
            <Input
              type="number"
              min="0"
              value={form.capacity}
              onChange={(e) => set("capacity", e.target.value)}
              placeholder="Masalan: 15"
            />
          </Field>
          <Field label="Yo'nalish">
            <Input
              value={form.direction}
              onChange={(e) => set("direction", e.target.value)}
              placeholder="Masalan: IT"
            />
          </Field>
          <Field label="Dars kunlari">
            <Input
              value={form.scheduleDays}
              onChange={(e) => set("scheduleDays", e.target.value)}
              placeholder="Masalan: Dush, Chor, Jum"
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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

function Field({
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
