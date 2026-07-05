import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { extractApiError } from "@/lib/api";
import { createCourse, updateCourse, type Course } from "@/lib/resources";
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
import { Textarea } from "@/components/ui/textarea";

type FormState = {
  name: string;
  level: string;
  price: string;
  durationWeeks: string;
  description: string;
};

const empty: FormState = { name: "", level: "", price: "", durationWeeks: "", description: "" };

function fromCourse(c: Course | null): FormState {
  if (!c) return empty;
  return {
    name: c.name,
    level: c.level,
    price: c.price ? String(c.price) : "",
    durationWeeks: c.durationWeeks ? String(c.durationWeeks) : "",
    description: c.description,
  };
}

// CourseDialog is a controlled create/edit form: pass a course to edit, or null to create.
export function CourseDialog({
  open,
  onOpenChange,
  course,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  course: Course | null;
}) {
  const isEdit = !!course;
  const [form, setForm] = useState<FormState>(empty);
  const queryClient = useQueryClient();

  // Reset the form to the target course whenever the dialog opens.
  useEffect(() => {
    if (open) setForm(fromCourse(course));
  }, [open, course]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        level: form.level || undefined,
        price: form.price ? Number(form.price) : undefined,
        durationWeeks: form.durationWeeks ? Number(form.durationWeeks) : undefined,
        description: form.description || undefined,
        isActive: course ? course.isActive : undefined,
      };
      if (isEdit && course) await updateCourse(course.id, payload);
      else await createCourse(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Kurs yangilandi" : "Kurs qo'shildi");
      queryClient.invalidateQueries({ queryKey: ["courses"] });
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
          <DialogTitle>{isEdit ? "Kursni tahrirlash" : "Yangi kurs"}</DialogTitle>
          <DialogDescription>Kurs ma'lumotlarini kiriting</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="grid grid-cols-1 gap-4"
        >
          <Field label="Nomi" required>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              placeholder="Masalan: IELTS Intermediate"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Daraja">
              <Input
                value={form.level}
                onChange={(e) => set("level", e.target.value)}
                placeholder="B1 / Boshlang'ich"
              />
            </Field>
            <Field label="Davomiyligi (hafta)">
              <Input
                type="number"
                min="0"
                value={form.durationWeeks}
                onChange={(e) => set("durationWeeks", e.target.value)}
                placeholder="12"
              />
            </Field>
          </div>
          <Field label="Narx (so'm)">
            <Input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="500000"
            />
          </Field>
          <Field label="Tavsif">
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Ixtiyoriy"
            />
          </Field>
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
