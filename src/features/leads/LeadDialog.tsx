import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { extractApiError } from "@/lib/api";
import { createLead, updateLead, type Lead } from "@/lib/resources";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Pipeline stages, in funnel order. Shared with the Leads board.
export const STAGE_OPTIONS = [
  { key: "new", label: "Yangi" },
  { key: "contacted", label: "Bog'lanildi" },
  { key: "trial", label: "Sinov darsi" },
  { key: "enrolled", label: "Yozildi" },
  { key: "lost", label: "Yo'qotildi" },
];

type FormState = {
  name: string;
  phone: string;
  email: string;
  source: string;
  interest: string;
  stage: string;
  note: string;
};
const empty: FormState = {
  name: "",
  phone: "",
  email: "",
  source: "",
  interest: "",
  stage: "new",
  note: "",
};

export function LeadDialog({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lead: Lead | null;
}) {
  const isEdit = !!lead;
  const [form, setForm] = useState<FormState>(empty);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setForm(
      lead
        ? {
            name: lead.name,
            phone: lead.phone ?? "",
            email: lead.email ?? "",
            source: lead.source ?? "",
            interest: lead.interest ?? "",
            stage: lead.stage,
            note: lead.note ?? "",
          }
        : empty,
    );
  }, [open, lead]);

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        source: form.source || undefined,
        interest: form.interest || undefined,
        stage: form.stage,
        note: form.note || undefined,
      };
      if (isEdit && lead) await updateLead(lead.id, body);
      else await createLead(body);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Yangilandi" : "Lid qo'shildi");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
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
          <DialogTitle>{isEdit ? "Lidni tahrirlash" : "Yangi lid"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (form.name.trim()) mutation.mutate();
          }}
          className="grid grid-cols-1 gap-4"
        >
          <F label="Ism" required>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </F>
          <div className="grid grid-cols-2 gap-4">
            <F label="Telefon">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </F>
            <F label="Email">
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Manba">
              <Input
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
                placeholder="instagram / tavsiya"
              />
            </F>
            <F label="Bosqich">
              <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_OPTIONS.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
          </div>
          <F label="Qiziqish (kurs)">
            <Input
              value={form.interest}
              onChange={(e) => set("interest", e.target.value)}
              placeholder="IELTS / Frontend"
            />
          </F>
          <F label="Izoh">
            <Textarea value={form.note} onChange={(e) => set("note", e.target.value)} rows={2} />
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
