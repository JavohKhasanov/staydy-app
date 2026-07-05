import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { extractApiError } from "@/lib/api";
import {
  createEnrollment,
  deleteEnrollment,
  listCourses,
  listEnrollments,
  listGroups,
  updateEnrollment,
  type Course,
  type Enrollment,
} from "@/lib/resources";
import type { Group } from "@/lib/types";
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

const STATUS_LABELS: Record<string, string> = {
  active: "Faol",
  completed: "Tugatgan",
  dropped: "Tashlab ketgan",
  frozen: "Muzlatilgan",
};
const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  completed: "bg-sky-50 text-sky-700",
  dropped: "bg-rose-50 text-rose-700",
  frozen: "bg-amber-50 text-amber-700",
};

function fmtPrice(p: number): string {
  return p > 0 ? `${p.toLocaleString("ru-RU")} so'm` : "—";
}

// EnrollmentsSection lists a student's course enrolments and lets a center_admin add/edit/remove
// them. Course/group names are resolved from the loaded lists (the API returns ids).
export function EnrollmentsSection({ studentId }: { studentId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Enrollment | null>(null);
  const queryClient = useQueryClient();

  const enrollments = useQuery({
    queryKey: ["enrollments", studentId],
    queryFn: () => listEnrollments(studentId),
  });
  const courses = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const groups = useQuery({ queryKey: ["groups"], queryFn: listGroups });

  const courseName = (id?: string) => courses.data?.find((c) => c.id === id)?.name ?? "—";
  const groupName = (id?: string) => groups.data?.find((g) => g.id === id)?.name ?? "—";

  const del = useMutation({
    mutationFn: (id: string) => deleteEnrollment(id),
    onSuccess: () => {
      toast.success("Yozuv o'chirildi");
      queryClient.invalidateQueries({ queryKey: ["enrollments", studentId] });
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const list = enrollments.data ?? [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900">Kurslar (yozuvlar)</h2>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Yangi yozuv
        </Button>
      </div>

      {enrollments.isLoading ? (
        <p className="text-sm text-slate-500">Yuklanmoqda...</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-slate-500">Hali kursga yozilmagan.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2 pr-3 font-medium">Kurs</th>
                <th className="py-2 pr-3 font-medium">Guruh</th>
                <th className="py-2 pr-3 font-medium">Holat</th>
                <th className="py-2 pr-3 font-medium text-right">Narx</th>
                <th className="py-2 pr-3 font-medium text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((e) => (
                <tr key={e.id}>
                  <td className="py-2 pr-3 text-slate-800">{courseName(e.courseId)}</td>
                  <td className="py-2 pr-3 text-slate-600">{groupName(e.groupId)}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[e.status] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {STATUS_LABELS[e.status] ?? e.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-slate-700">
                    {fmtPrice(e.price)}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(e);
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
                          if (window.confirm("Yozuvni o'chirasizmi?")) del.mutate(e.id);
                        }}
                        className="text-rose-600 hover:bg-rose-50"
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

      <EnrollmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        studentId={studentId}
        enrollment={editing}
        courses={courses.data ?? []}
        groups={groups.data ?? []}
      />
    </div>
  );
}

type FormState = {
  courseId: string;
  groupId: string;
  status: string;
  price: string;
  discount: string;
  startDate: string;
  endDate: string;
};
const emptyForm: FormState = {
  courseId: "",
  groupId: "",
  status: "active",
  price: "",
  discount: "",
  startDate: "",
  endDate: "",
};

function EnrollmentDialog({
  open,
  onOpenChange,
  studentId,
  enrollment,
  courses,
  groups,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  studentId: string;
  enrollment: Enrollment | null;
  courses: Course[];
  groups: Group[];
}) {
  const isEdit = !!enrollment;
  const [form, setForm] = useState<FormState>(emptyForm);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setForm(
      enrollment
        ? {
            courseId: enrollment.courseId ?? "",
            groupId: enrollment.groupId ?? "",
            status: enrollment.status,
            price: enrollment.price ? String(enrollment.price) : "",
            discount: enrollment.discount ? String(enrollment.discount) : "",
            startDate: enrollment.startDate ?? "",
            endDate: enrollment.endDate ?? "",
          }
        : emptyForm,
    );
  }, [open, enrollment]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        courseId: form.courseId || undefined,
        groupId: form.groupId || undefined,
        status: form.status,
        price: form.price ? Number(form.price) : undefined,
        discount: form.discount ? Number(form.discount) : undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      };
      if (isEdit && enrollment) await updateEnrollment(enrollment.id, payload);
      else await createEnrollment(studentId, payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Yangilandi" : "Qo'shildi");
      queryClient.invalidateQueries({ queryKey: ["enrollments", studentId] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Picking a course defaults the price from that course (unless already typed).
  const onCourse = (id: string) => {
    const c = courses.find((x) => x.id === id);
    setForm((f) => ({ ...f, courseId: id, price: f.price || (c?.price ? String(c.price) : "") }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Yozuvni tahrirlash" : "Yangi yozuv"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="grid grid-cols-1 gap-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Kurs">
              <Select
                value={form.courseId || NONE}
                onValueChange={(v) => onCourse(v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Guruh">
              <Select
                value={form.groupId || NONE}
                onValueChange={(v) => set("groupId", v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Holat">
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Faol</SelectItem>
                  <SelectItem value="completed">Tugatgan</SelectItem>
                  <SelectItem value="dropped">Tashlab ketgan</SelectItem>
                  <SelectItem value="frozen">Muzlatilgan</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Narx (so'm)">
              <Input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Chegirma (%)">
              <Input
                type="number"
                min="0"
                max="100"
                value={form.discount}
                onChange={(e) => set("discount", e.target.value)}
              />
            </Field>
            <Field label="Boshlanish">
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </Field>
            <Field label="Tugash">
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
              />
            </Field>
          </div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      {children}
    </div>
  );
}
