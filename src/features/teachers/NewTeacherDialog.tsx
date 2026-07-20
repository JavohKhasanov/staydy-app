import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

import { extractApiError } from "@/lib/api";
import { createTeacher, listBranches } from "@/lib/resources";
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

type FormState = { fullName: string; email: string; password: string; branchId: string };
const initial: FormState = { fullName: "", email: "", password: "", branchId: "" };

export function NewTeacherDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initial);
  const queryClient = useQueryClient();
  const branchesQ = useQuery({ queryKey: ["branches"], queryFn: listBranches });
  const branches = branchesQ.data ?? [];

  const mutation = useMutation({
    mutationFn: async () => {
      await createTeacher({ fullName: form.fullName, email: form.email, password: form.password, branchId: form.branchId });
    },
    onSuccess: () => {
      toast.success("Ustoz qo'shildi");
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
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
          Yangi ustoz
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Yangi ustoz qo'shish</DialogTitle>
          <DialogDescription>
            Ustoz web-panelga shu email/parol bilan kiradi (role: ustoz)
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="grid grid-cols-1 gap-4"
        >
          <Field label="To'liq ism" required>
            <Input
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              required
              placeholder="Masalan: Ali Valiyev"
            />
          </Field>
          <Field label="Email" required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
              placeholder="ustoz@markaz.uz"
            />
          </Field>
          {branches.length > 0 && (
            <Field label="Filial" required>
              <select
                value={form.branchId}
                onChange={(e) => set("branchId", e.target.value)}
                required
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700"
              >
                <option value="" disabled>
                  Filial tanlang
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Parol (kamida 8 belgi)" required>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
              minLength={8}
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
