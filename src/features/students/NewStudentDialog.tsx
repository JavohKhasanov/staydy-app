import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

import { extractApiError } from "@/lib/api";
import {
  assignStudentGroup,
  createStudent,
  listBranches,
  listGroups,
  listTeachers,
} from "@/lib/resources";
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
import { MENTOR_ENABLED } from "@/lib/flags";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

type FormState = {
  fullName: string;
  phone: string;
  groupId: string;
  mentorId: string;
  branchId: string;
  email: string;
  birthDate: string;
  gender: string;
  secondPhone: string;
  parentName: string;
  parentPhone: string;
  address: string;
};

const initial: FormState = {
  fullName: "",
  phone: "",
  groupId: "",
  mentorId: "",
  branchId: "",
  email: "",
  birthDate: "",
  gender: "",
  secondPhone: "",
  parentName: "",
  parentPhone: "",
  address: "",
};

// Deliberately minimal (the way education CRMs do it): identity + contact + group/mentor. Coaching
// and survey fields (goals, motivation, progress, obstacle) are NOT collected here — motivation/
// progress/obstacle come from the weekly bot check-in; confidence defaults to 5.
export function NewStudentDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initial);
  const queryClient = useQueryClient();
  const groups = useQuery({ queryKey: ["groups"], queryFn: listGroups });
  const teachers = useQuery({ queryKey: ["teachers"], queryFn: listTeachers });
  const branches = useQuery({ queryKey: ["branches"], queryFn: listBranches });

  const mutation = useMutation({
    mutationFn: async () => {
      const id = await createStudent({
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        birthDate: form.birthDate,
        gender: form.gender,
        secondPhone: form.secondPhone,
        parentName: form.parentName,
        parentPhone: form.parentPhone,
        address: form.address,
        mentorId: form.mentorId || undefined,
        branchId: form.branchId || undefined,
      });
      if (form.groupId) await assignStudentGroup(id, form.groupId);
    },
    onSuccess: () => {
      toast.success("Talaba qo'shildi");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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
          Yangi talaba
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yangi talaba qo'shish</DialogTitle>
          <DialogDescription>Asosiy ma'lumot yetarli — qolganini keyin qo'shasiz</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (form.fullName.trim()) mutation.mutate();
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Field label="To'liq ism" required>
            <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required />
          </Field>
          <Field label="Telefon">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>

          <Field label="Guruh">
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
          </Field>
          {MENTOR_ENABLED && (
          <Field label="Mentor">
            <Select value={form.mentorId || NONE} onValueChange={(v) => set("mentorId", v === NONE ? "" : v)}>
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
          </Field>
          )}

          {(branches.data?.length ?? 0) > 0 && (
            <Field label="Filial">
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
            </Field>
          )}

          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Tug'ilgan sana">
            <Input type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} />
          </Field>

          <Field label="Jins">
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
          </Field>
          <Field label="Ikkinchi telefon">
            <Input value={form.secondPhone} onChange={(e) => set("secondPhone", e.target.value)} />
          </Field>

          <Field label="Ota-ona ismi">
            <Input value={form.parentName} onChange={(e) => set("parentName", e.target.value)} />
          </Field>
          <Field label="Ota-ona telefoni">
            <Input value={form.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} />
          </Field>

          <Field label="Manzil" full>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
          </Field>

          <DialogFooter className="md:col-span-2">
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
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${full ? "md:col-span-2" : ""}`}>
      <Label className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </Label>
      {children}
    </div>
  );
}
