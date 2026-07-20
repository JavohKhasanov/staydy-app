import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Search, UserPlus } from "lucide-react";

import { extractApiError } from "@/lib/api";
import { addGroupMember, createStudent, listStudents } from "@/lib/resources";
import { formatUzPhone, stripPhone } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// AddStudentDialog attaches existing students to a group right from the group page.
// Students already in another group show their current group and get MOVED on add.
export function AddStudentDialog({
  groupId,
  groupName,
  branchId,
  onClose,
}: {
  groupId: string;
  groupName: string;
  branchId?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("+998 ");
  const studentsQ = useQuery({ queryKey: ["students"], queryFn: listStudents });

  const term = q.trim().toLowerCase();
  const candidates = (studentsQ.data ?? [])
    .filter((s) => s.groupId !== groupId)
    .filter((s) => !term || s.fullName?.toLowerCase().includes(term) || s.phone?.includes(term))
    .slice(0, 30);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["students"] });
    qc.invalidateQueries({ queryKey: ["group-students"] });
    qc.invalidateQueries({ queryKey: ["group-finance"] });
  };

  const add = useMutation({
    mutationFn: (studentId: string) => addGroupMember(groupId, studentId),
    onSuccess: () => {
      toast.success("Talaba guruhga qo'shildi");
      invalidate();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  // Walk-in flow: create a brand-new student and attach them to this group in one go
  // (inherits the group's branch).
  const createAndAdd = useMutation({
    mutationFn: async () => {
      const id = await createStudent({ fullName: newName.trim(), phone: stripPhone(newPhone), branchId });
      await addGroupMember(groupId, id);
    },
    onSuccess: () => {
      toast.success("Yangi talaba yaratildi va guruhga qo'shildi");
      setNewName("");
      setNewPhone("+998 ");
      invalidate();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Talaba qo'shish — {groupName}</DialogTitle>
          <DialogDescription>
            Mavjud talabani tanlang — talaba bir vaqtda bir nechta guruhda o'qishi mumkin.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ism yoki telefon bo'yicha qidirish..."
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200">
          {studentsQ.isLoading && (
            <div className="flex items-center justify-center p-6 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {!studentsQ.isLoading && candidates.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-500">Talaba topilmadi</div>
          )}
          {candidates.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-800">{s.fullName}</div>
                <div className="text-xs text-slate-400">
                  {s.group ? `Guruhlari: ${s.group}` : "Guruhsiz"}
                  {s.phone ? ` · ${s.phone}` : ""}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 shrink-0 text-xs"
                disabled={add.isPending}
                onClick={() => add.mutate(s.id)}
              >
                <UserPlus className="mr-1 h-3.5 w-3.5" />
                Qo'shish
              </Button>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/40 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Yoki yangi talaba yarating
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) createAndAdd.mutate();
            }}
            className="flex flex-wrap gap-2"
          >
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="To'liq ism *"
              required
              className="flex-1 min-w-36 bg-white"
            />
            <Input
              value={newPhone}
              onChange={(e) => setNewPhone(formatUzPhone(e.target.value))}
              inputMode="tel"
              placeholder="+998 90 123 45 67"
              className="w-44 bg-white"
            />
            <Button
              type="submit"
              size="sm"
              disabled={createAndAdd.isPending || !newName.trim()}
              className="h-10 bg-indigo-600 hover:bg-indigo-700 shrink-0"
            >
              {createAndAdd.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              <span className="ml-1.5">Yaratish</span>
            </Button>
          </form>
          <p className="mt-1.5 text-xs text-slate-500">
            Qolgan ma'lumotlarni keyin talaba sahifasida to'ldirish mumkin.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
