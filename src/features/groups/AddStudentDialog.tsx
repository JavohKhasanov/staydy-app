import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Search, UserPlus } from "lucide-react";

import { extractApiError } from "@/lib/api";
import { assignStudentGroup, listStudents } from "@/lib/resources";
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
  onClose,
}: {
  groupId: string;
  groupName: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const studentsQ = useQuery({ queryKey: ["students"], queryFn: listStudents });

  const term = q.trim().toLowerCase();
  const candidates = (studentsQ.data ?? [])
    .filter((s) => s.groupId !== groupId)
    .filter((s) => !term || s.fullName?.toLowerCase().includes(term) || s.phone?.includes(term))
    .slice(0, 30);

  const add = useMutation({
    mutationFn: (studentId: string) => assignStudentGroup(studentId, groupId),
    onSuccess: () => {
      toast.success("Talaba guruhga qo'shildi");
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["group-students"] });
      qc.invalidateQueries({ queryKey: ["group-finance"] });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Talaba qo'shish — {groupName}</DialogTitle>
          <DialogDescription>
            Mavjud talabani tanlang. Boshqa guruhdagi talaba shu guruhga ko'chiriladi.
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
                  {s.group ? `Hozir: ${s.group}` : "Guruhsiz"}
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
      </DialogContent>
    </Dialog>
  );
}
