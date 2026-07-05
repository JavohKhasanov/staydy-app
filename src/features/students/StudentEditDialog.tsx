import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { extractApiError } from "@/lib/api";
import { listBranches, listTeachers, updateStudent } from "@/lib/resources";
import type { Student } from "@/lib/types";
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

const STATUS_OPTIONS = [
  { key: "active", label: "Faol" },
  { key: "inactive", label: "Nofaol" },
  { key: "graduated", label: "Bitirgan" },
  { key: "lead", label: "Lead" },
  { key: "dropped", label: "Tashlab ketgan" },
];

// FormState holds ALL editable fields. UpdateStudent is a full overwrite, so the goal/target/hours
// fields (kept in state, not shown) are pre-filled from the student and sent back unchanged so a
// quick edit never wipes them.
type FormState = {
  fullName: string;
  phone: string;
  email: string;
  secondPhone: string;
  birthDate: string;
  gender: string;
  parentName: string;
  parentPhone: string;
  address: string;
  studentCode: string;
  status: string;
  mentorId: string;
  branchId: string;
  confidenceLevel: string;
  onboardingGoal: string;
  sixMonthTarget: string;
  weeklyStudyHours: string;
};

function fromStudent(s: Student): FormState {
  return {
    fullName: s.fullName,
    phone: s.phone ?? "",
    email: s.email ?? "",
    secondPhone: s.secondPhone ?? "",
    birthDate: s.birthDate ?? "",
    gender: s.gender ?? "",
    parentName: s.parentName ?? "",
    parentPhone: s.parentPhone ?? "",
    address: s.address ?? "",
    studentCode: s.studentCode ?? "",
    status: s.status || "active",
    mentorId: s.mentorId ?? "",
    branchId: s.branchId ?? "",
    confidenceLevel: s.confidenceLevel ? String(s.confidenceLevel) : "5",
    onboardingGoal: s.goal ?? "",
    sixMonthTarget: s.sixMonthTarget ?? "",
    weeklyStudyHours: s.weeklyStudyHours ?? "",
  };
}

export function StudentEditDialog({
  open,
  onOpenChange,
  student,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  student: Student;
}) {
  const [form, setForm] = useState<FormState>(() => fromStudent(student));
  const queryClient = useQueryClient();
  const teachers = useQuery({ queryKey: ["teachers"], queryFn: listTeachers });
  const branches = useQuery({ queryKey: ["branches"], queryFn: listBranches });

  useEffect(() => {
    if (open) setForm(fromStudent(student));
  }, [open, student]);

  const mutation = useMutation({
    mutationFn: () =>
      updateStudent(student.id, {
        fullName: form.fullName,
        phone: form.phone || undefined,
        email: form.email || undefined,
        secondPhone: form.secondPhone || undefined,
        birthDate: form.birthDate || undefined,
        gender: form.gender || undefined,
        parentName: form.parentName || undefined,
        parentPhone: form.parentPhone || undefined,
        address: form.address || undefined,
        studentCode: form.studentCode || undefined,
        status: form.status || undefined,
        mentorId: form.mentorId || undefined,
        branchId: form.branchId,
        confidenceLevel: form.confidenceLevel ? Number(form.confidenceLevel) : undefined,
        onboardingGoal: form.onboardingGoal || undefined,
        sixMonthTarget: form.sixMonthTarget || undefined,
        weeklyStudyHours: form.weeklyStudyHours || undefined,
      }),
    onSuccess: () => {
      toast.success("Saqlandi");
      queryClient.invalidateQueries({ queryKey: ["student", student.id] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Talabani tahrirlash</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (form.fullName.trim()) mutation.mutate();
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <F label="To'liq ism" required>
            <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required />
          </F>
          <F label="Holat">
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
          <F label="Telefon">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </F>
          <F label="Ikkinchi telefon">
            <Input value={form.secondPhone} onChange={(e) => set("secondPhone", e.target.value)} />
          </F>
          <F label="Email">
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </F>
          <F label="Tug'ilgan sana">
            <Input type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} />
          </F>
          <F label="Jins">
            <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Erkak</SelectItem>
                <SelectItem value="female">Ayol</SelectItem>
                <SelectItem value="other">Boshqa</SelectItem>
              </SelectContent>
            </Select>
          </F>
          <F label="Talaba kodi">
            <Input value={form.studentCode} onChange={(e) => set("studentCode", e.target.value)} />
          </F>
          <F label="Mentor">
            <Select
              value={form.mentorId || NONE}
              onValueChange={(v) => set("mentorId", v === NONE ? "" : v)}
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
          {(branches.data?.length ?? 0) > 0 && (
            <F label="Filial">
              <Select
                value={form.branchId || NONE}
                onValueChange={(v) => set("branchId", v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {(branches.data ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
          )}
          <F label="Ota-ona ismi">
            <Input value={form.parentName} onChange={(e) => set("parentName", e.target.value)} />
          </F>
          <F label="Ota-ona telefoni">
            <Input value={form.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} />
          </F>
          <F label="Manzil">
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
          </F>
          <F label="Ishonch darajasi (1-10)">
            <Select value={form.confidenceLevel} onValueChange={(v) => set("confidenceLevel", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
          <DialogFooter className="md:col-span-2">
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
