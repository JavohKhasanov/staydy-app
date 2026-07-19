import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil, KeyRound, Trash2 } from "lucide-react";

import { extractApiError } from "@/lib/api";
import { updateTeacher, setTeacherPassword, deleteTeacher } from "@/lib/resources";
import type { Teacher } from "@/lib/types";
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

type Mode = "edit" | "password" | "delete" | null;

export function TeacherActions({ teacher }: { teacher: Teacher }) {
  const [mode, setMode] = useState<Mode>(null);
  const close = () => setMode(null);

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <IconBtn title="Tahrirlash" onClick={() => setMode("edit")}>
          <Pencil className="h-4 w-4" />
        </IconBtn>
        <IconBtn title="Parolni almashtirish" onClick={() => setMode("password")}>
          <KeyRound className="h-4 w-4" />
        </IconBtn>
        <IconBtn title="O'chirish" danger onClick={() => setMode("delete")}>
          <Trash2 className="h-4 w-4" />
        </IconBtn>
      </div>

      {mode === "edit" && <EditDialog teacher={teacher} onClose={close} />}
      {mode === "password" && <PasswordDialog teacher={teacher} onClose={close} />}
      {mode === "delete" && <DeleteDialog teacher={teacher} onClose={close} />}
    </>
  );
}

function IconBtn({
  title,
  danger,
  onClick,
  children,
}: {
  title: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`rounded-md p-1.5 transition ${
        danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
      }`}
    >
      {children}
    </button>
  );
}

function EditDialog({ teacher, onClose }: { teacher: Teacher; onClose: () => void }) {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState(teacher.fullName);
  const [email, setEmail] = useState(teacher.email);

  const m = useMutation({
    mutationFn: () => updateTeacher(teacher.id, { fullName, email }),
    onSuccess: () => {
      toast.success("Saqlandi");
      qc.invalidateQueries({ queryKey: ["teachers"] });
      onClose();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ustozni tahrirlash</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
          className="grid gap-4"
        >
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">To'liq ism</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={m.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {m.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Saqlash
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({ teacher, onClose }: { teacher: Teacher; onClose: () => void }) {
  const [password, setPassword] = useState("");

  const m = useMutation({
    mutationFn: () => setTeacherPassword(teacher.id, password),
    onSuccess: () => {
      toast.success("Parol yangilandi");
      onClose();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Parolni almashtirish</DialogTitle>
          <DialogDescription>
            {teacher.fullName} shu yangi parol bilan kiradi.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
          className="grid gap-4"
        >
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Yangi parol (kamida 8 belgi)</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={m.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {m.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Yangilash
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ teacher, onClose }: { teacher: Teacher; onClose: () => void }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => deleteTeacher(teacher.id),
    onSuccess: () => {
      toast.success("O'chirildi");
      qc.invalidateQueries({ queryKey: ["teachers"] });
      onClose();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ustozni o'chirish</DialogTitle>
          <DialogDescription>
            {teacher.fullName} ({teacher.email}) o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi.
            Guruhlardagi biriktirilishi bo'sh qoladi.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            onClick={() => m.mutate()}
            disabled={m.isPending}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {m.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            O'chirish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
