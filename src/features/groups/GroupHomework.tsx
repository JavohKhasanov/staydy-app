import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookCheck, CalendarClock, Check, Loader2, Plus, Trash2, X } from "lucide-react";

import { extractApiError } from "@/lib/api";
import {
  createAssignment,
  deleteAssignment,
  gradeSubmission,
  listGroupHomework,
  listSubmissions,
  updateAssignment,
  type Assignment,
  type Submission,
} from "@/lib/resources";
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

const STATUS_UI: Record<string, { label: string; cls: string }> = {
  submitted: { label: "Topshirildi", cls: "bg-indigo-50 text-indigo-700" },
  accepted: { label: "Qabul qilindi", cls: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Rad etildi", cls: "bg-rose-50 text-rose-600" },
};

// GroupHomework is the teacher/admin homework panel for a group: create assignments and grade
// submissions (XP 0..max), which feeds the students' mini app + gamification.
export function GroupHomework({ groupId }: { groupId: string }) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [grading, setGrading] = useState<Assignment | null>(null);
  const [editing, setEditing] = useState<Assignment | null>(null);

  const q = useQuery({
    queryKey: ["group-homework", groupId],
    queryFn: () => listGroupHomework(groupId),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteAssignment(id),
    onSuccess: () => {
      toast.success("O'chirildi");
      qc.invalidateQueries({ queryKey: ["group-homework", groupId] });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const rows = q.data ?? [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
          <BookCheck className="h-4 w-4 text-slate-400" />
          Uyga vazifalar
        </span>
        <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Vazifa qo'shish
        </Button>
      </div>

      {q.isLoading && (
        <div className="flex justify-center p-6 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      {!q.isLoading && rows.length === 0 && (
        <div className="p-6 text-center text-sm text-slate-500">Hali vazifa yo'q.</div>
      )}
      {rows.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {rows.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{a.title}</div>
                <div className="text-xs text-slate-400">
                  {a.deadline ? `Muddat: ${new Date(a.deadline).toLocaleString("uz-UZ")}` : "Muddatsiz"}
                  {" · "}
                  {a.submissionCount} topshiriq
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setGrading(a)}>
                  Baholash
                </Button>
                <button
                  onClick={() => setEditing(a)}
                  className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                  title="Tahrirlash / muddatni uzaytirish"
                >
                  <CalendarClock className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`"${a.title}" o'chirilsinmi?`)) del.mutate(a.id);
                  }}
                  className="rounded p-1.5 text-rose-500 hover:bg-rose-50"
                  title="O'chirish"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {creating && <CreateDialog groupId={groupId} onClose={() => setCreating(false)} />}
      {editing && <EditDialog assignment={editing} onClose={() => setEditing(null)} />}
      {grading && <GradeDialog assignment={grading} onClose={() => setGrading(null)} />}
    </div>
  );
}

function CreateDialog({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [maxScore, setMaxScore] = useState("5");

  const m = useMutation({
    mutationFn: () =>
      createAssignment(groupId, {
        title,
        description: description || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        maxScore: Number(maxScore) || 5,
      }),
    onSuccess: () => {
      toast.success("Vazifa qo'shildi");
      qc.invalidateQueries({ queryKey: ["group-homework", groupId] });
      onClose();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yangi vazifa</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) m.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <Label className="text-xs">Sarlavha</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 h-9" />
          </div>
          <div>
            <Label className="text-xs">Tavsif</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Topshiriq matni…"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Muddat (ixtiyoriy)</Label>
              <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-xs">Maks. XP</Label>
              <Input type="number" min="0" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} className="mt-1 h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={m.isPending || !title.trim()} className="bg-indigo-600 hover:bg-indigo-700">
              {m.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Qo'shish
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// toLocalInput converts an ISO deadline to the value a datetime-local input expects (local time).
function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditDialog({ assignment, onClose }: { assignment: Assignment; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(assignment.title);
  const [description, setDescription] = useState(assignment.description ?? "");
  const [deadline, setDeadline] = useState(toLocalInput(assignment.deadline));
  const [maxScore, setMaxScore] = useState(String(assignment.maxScore));

  const m = useMutation({
    mutationFn: () =>
      updateAssignment(assignment.id, {
        title,
        description: description || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : "",
        maxScore: Number(maxScore) || assignment.maxScore,
      }),
    onSuccess: () => {
      toast.success("Saqlandi");
      qc.invalidateQueries({ queryKey: ["group-homework", assignment.groupId] });
      onClose();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vazifani tahrirlash</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) m.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <Label className="text-xs">Sarlavha</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 h-9" />
          </div>
          <div>
            <Label className="text-xs">Tavsif</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Muddat (uzaytirish)</Label>
              <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-xs">Maks. XP</Label>
              <Input type="number" min="0" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} className="mt-1 h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={m.isPending || !title.trim()} className="bg-indigo-600 hover:bg-indigo-700">
              {m.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Saqlash
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GradeDialog({ assignment, onClose }: { assignment: Assignment; onClose: () => void }) {
  const q = useQuery({
    queryKey: ["submissions", assignment.id],
    queryFn: () => listSubmissions(assignment.id),
  });
  const subs = q.data ?? [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Baholash — {assignment.title}</DialogTitle>
        </DialogHeader>
        {q.isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : subs.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500">Hali topshiriq yo'q.</div>
        ) : (
          <div className="space-y-3">
            {subs.map((s) => (
              <SubmissionRow key={s.id} sub={s} assignmentId={assignment.id} maxScore={assignment.maxScore} />
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Yopish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubmissionRow({ sub, assignmentId, maxScore }: { sub: Submission; assignmentId: string; maxScore: number }) {
  const qc = useQueryClient();
  const [xp, setXp] = useState(String(Math.min(maxScore, 5)));
  const ui = STATUS_UI[sub.status];

  const grade = useMutation({
    mutationFn: (status: "accepted" | "rejected") =>
      gradeSubmission(sub.id, { status, xp: status === "accepted" ? Number(xp) || 0 : undefined }),
    onSuccess: () => {
      toast.success("Baholandi");
      qc.invalidateQueries({ queryKey: ["submissions", assignmentId] });
      qc.invalidateQueries({ queryKey: ["group-homework"] });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const links = (sub.links ?? "").split("\n").filter(Boolean);

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-800">{sub.studentName ?? "Talaba"}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ui.cls}`}>
          {ui.label}
          {sub.score != null ? ` · ${sub.score} XP` : ""}
        </span>
      </div>
      {sub.text && <p className="mt-1 text-sm text-slate-600 whitespace-pre-line">{sub.text}</p>}
      {links.map((l) => (
        <a key={l} href={l} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-indigo-600 underline break-all">
          {l}
        </a>
      ))}
      {sub.status === "submitted" && (
        <div className="mt-2 flex items-center gap-2">
          <Input
            type="number"
            min="0"
            max={maxScore}
            value={xp}
            onChange={(e) => setXp(e.target.value)}
            className="h-8 w-20 text-right"
          />
          <span className="text-xs text-slate-400">/ {maxScore} XP</span>
          <Button
            size="sm"
            className="h-8 bg-emerald-600 hover:bg-emerald-700"
            disabled={grade.isPending}
            onClick={() => grade.mutate("accepted")}
          >
            <Check className="h-4 w-4 mr-1" /> Qabul
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-rose-600"
            disabled={grade.isPending}
            onClick={() => grade.mutate("rejected")}
          >
            <X className="h-4 w-4 mr-1" /> Rad
          </Button>
        </div>
      )}
    </div>
  );
}
