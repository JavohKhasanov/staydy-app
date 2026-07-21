import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { extractApiError } from "@/lib/api";
import {
  createStaff,
  deleteStaff,
  listStaff,
  setStaffPassword,
  updateStaff,
  type Staff,
  type StaffRole,
} from "@/lib/resources";
import { PageHeader } from "@/components/PageHeader";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { Pagination, usePaged } from "@/components/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/staff/")({
  head: () => ({ meta: [{ title: "Xodimlar — Staydy" }] }),
  component: StaffPage,
});

const ROLE_UI: Record<StaffRole, { label: string; cls: string }> = {
  center_admin: { label: "Direktor", cls: "bg-violet-50 text-violet-700" },
  manager: { label: "Administrator", cls: "bg-indigo-50 text-indigo-700" },
  finance: { label: "Moliya", cls: "bg-emerald-50 text-emerald-700" },
};

function StaffPage() {
  const [creating, setCreating] = useState(false);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["staff"],
    queryFn: listStaff,
  });
  const all = data ?? [];
  const { rows, ...pg } = usePaged(all);

  return (
    <div>
      <PageHeader
        title="Xodimlar"
        description="Administrator va moliya hisoblarini boshqaring"
        actions={
          <Button onClick={() => setCreating(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" />
            Xodim qo'shish
          </Button>
        }
      />
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading && <LoadingBlock />}
        {isError && <ErrorBlock message={extractApiError(error)} onRetry={() => refetch()} />}
        {!isLoading && !isError && all.length === 0 && (
          <EmptyBlock title="Xodim yo'q" description="Administrator yoki moliya xodimi qo'shing" />
        )}
        {!isLoading && !isError && all.length > 0 && (
          <div className="overflow-x-auto max-h-[62vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Ism</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.fullName}</td>
                    <td className="px-4 py-3 text-slate-600">{s.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_UI[s.role].cls}`}>
                        {ROLE_UI[s.role].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StaffActions staff={s} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination {...pg} />
      </div>

      {creating && <StaffDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

function StaffActions({ staff }: { staff: Staff }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [pwd, setPwd] = useState(false);

  const del = useMutation({
    mutationFn: () => deleteStaff(staff.id),
    onSuccess: () => {
      toast.success("O'chirildi");
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={() => setEditing(true)}
        title="Tahrirlash"
        className="text-slate-500 hover:bg-slate-100 rounded p-1.5"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        onClick={() => setPwd(true)}
        title="Parolni o'zgartirish"
        className="text-slate-500 hover:bg-slate-100 rounded p-1.5"
      >
        <KeyRound className="h-4 w-4" />
      </button>
      <button
        onClick={() => {
          if (window.confirm(`${staff.fullName} — xodimni o'chirasizmi?`)) del.mutate();
        }}
        title="O'chirish"
        className="text-rose-500 hover:bg-rose-50 rounded p-1.5"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      {editing && <StaffDialog staff={staff} onClose={() => setEditing(false)} />}
      {pwd && <PasswordDialog staff={staff} onClose={() => setPwd(false)} />}
    </div>
  );
}

// StaffDialog creates a new staff member or edits an existing one (name, email, role; password only
// on create).
function StaffDialog({ staff, onClose }: { staff?: Staff; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!staff;
  const [fullName, setFullName] = useState(staff?.fullName ?? "");
  const [email, setEmail] = useState(staff?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>(staff?.role ?? "manager");

  const m = useMutation({
    mutationFn: () =>
      isEdit
        ? updateStaff(staff!.id, { fullName, email, role })
        : createStaff({ fullName, email, password, role }),
    onSuccess: () => {
      toast.success(isEdit ? "Saqlandi" : "Xodim qo'shildi");
      qc.invalidateQueries({ queryKey: ["staff"] });
      onClose();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Xodimni tahrirlash" : "Yangi xodim"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <Label className="text-xs">To'liq ism</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1 h-9" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 h-9"
            />
          </div>
          {!isEdit && (
            <div>
              <Label className="text-xs">Parol</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                placeholder="kamida 8 belgi"
                className="mt-1 h-9"
              />
            </div>
          )}
          <div>
            <Label className="text-xs">Rol</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="mt-1 block w-full h-9 rounded-md border border-slate-300 px-2 text-sm"
            >
              <option value="manager">Administrator (kundalik ish + to'lov yig'ish)</option>
              <option value="finance">Moliya (moliya, maosh, hisobotlar)</option>
              <option value="center_admin">Direktor (to'liq — hammasi)</option>
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Administrator maosh, xarajat va xodimlarni ko'rmaydi. Direktor hammasini ko'radi.
            </p>
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

function PasswordDialog({ staff, onClose }: { staff: Staff; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const m = useMutation({
    mutationFn: () => setStaffPassword(staff.id, password),
    onSuccess: () => {
      toast.success("Parol o'zgartirildi");
      onClose();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Parolni o'zgartirish — {staff.fullName}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <Label className="text-xs">Yangi parol</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              placeholder="kamida 8 belgi"
              className="mt-1 h-9"
              autoFocus
            />
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
