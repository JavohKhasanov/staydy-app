import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GraduationCap, Loader2, Plus, Trash2 } from "lucide-react";

import { extractApiError } from "@/lib/api";
import {
  createExam,
  deleteExam,
  getExamResults,
  gradeExam,
  listGroupExams,
  listGroupStudents,
  type Exam,
} from "@/lib/resources";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// GroupExams is the teacher/admin exam panel for a group: create exams and record each student's
// score (which awards XP toward the rating).
export function GroupExams({ groupId }: { groupId: string }) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [grading, setGrading] = useState<Exam | null>(null);

  const q = useQuery({ queryKey: ["group-exams", groupId], queryFn: () => listGroupExams(groupId) });
  const del = useMutation({
    mutationFn: (id: string) => deleteExam(id),
    onSuccess: () => {
      toast.success("O'chirildi");
      qc.invalidateQueries({ queryKey: ["group-exams", groupId] });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const rows = q.data ?? [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
          <GraduationCap className="h-4 w-4 text-slate-400" />
          Imtihonlar
        </span>
        <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Imtihon qo'shish
        </Button>
      </div>

      {q.isLoading && (
        <div className="flex justify-center p-6 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      {!q.isLoading && rows.length === 0 && (
        <div className="p-6 text-center text-sm text-slate-500">Hali imtihon yo'q.</div>
      )}
      {rows.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {rows.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{e.title}</div>
                <div className="text-xs text-slate-400">
                  {e.examDate ? new Date(e.examDate).toLocaleDateString("uz-UZ") : "Sanasiz"}
                  {" · "}
                  {e.resultCount} baholangan · maks {e.maxScore}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setGrading(e)}>
                  Baholash
                </Button>
                <button
                  onClick={() => {
                    if (window.confirm(`"${e.title}" o'chirilsinmi?`)) del.mutate(e.id);
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

      {creating && <CreateExamDialog groupId={groupId} onClose={() => setCreating(false)} />}
      {grading && <GradeExamDialog exam={grading} groupId={groupId} onClose={() => setGrading(null)} />}
    </div>
  );
}

function CreateExamDialog({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [maxScore, setMaxScore] = useState("100");

  const m = useMutation({
    mutationFn: () =>
      createExam(groupId, { title, examDate: examDate || undefined, maxScore: Number(maxScore) || 100 }),
    onSuccess: () => {
      toast.success("Imtihon qo'shildi");
      qc.invalidateQueries({ queryKey: ["group-exams", groupId] });
      onClose();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yangi imtihon</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) m.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <Label className="text-xs">Nomi</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 h-9" placeholder="IELTS Mock 1" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Sana (ixtiyoriy)</Label>
              <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-xs">Maks. ball</Label>
              <Input type="number" min="1" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} className="mt-1 h-9" />
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

function GradeExamDialog({ exam, groupId, onClose }: { exam: Exam; groupId: string; onClose: () => void }) {
  const studentsQ = useQuery({ queryKey: ["group-students", groupId], queryFn: () => listGroupStudents(groupId) });
  const resultsQ = useQuery({ queryKey: ["exam-results", exam.id], queryFn: () => getExamResults(exam.id) });
  const students = studentsQ.data ?? [];
  const scoreByStudent = new Map((resultsQ.data?.results ?? []).map((r) => [r.studentId, r.score]));

  const loading = studentsQ.isLoading || resultsQ.isLoading;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Baholash — {exam.title} <span className="text-sm font-normal text-slate-400">(maks {exam.maxScore})</span>
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : students.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500">Guruhda talaba yo'q.</div>
        ) : (
          <div className="space-y-2">
            {students.map((s) => (
              <ExamScoreRow
                key={s.id}
                examId={exam.id}
                maxScore={exam.maxScore}
                studentId={s.id}
                name={s.fullName}
                initial={scoreByStudent.get(s.id)}
              />
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

function ExamScoreRow({
  examId,
  maxScore,
  studentId,
  name,
  initial,
}: {
  examId: string;
  maxScore: number;
  studentId: string;
  name: string;
  initial?: number;
}) {
  const qc = useQueryClient();
  const [score, setScore] = useState(initial != null ? String(initial) : "");
  const [saved, setSaved] = useState(initial != null);
  useEffect(() => setSaved(initial != null), [initial]);

  const grade = useMutation({
    mutationFn: () => gradeExam(examId, studentId, Math.min(maxScore, Math.max(0, Number(score) || 0))),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["exam-results", examId] });
      qc.invalidateQueries({ queryKey: ["group-exams"] });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
      <span className="text-sm font-medium text-slate-800">
        {name}
        {saved && <span className="ml-2 text-xs text-emerald-600">✓</span>}
      </span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          max={maxScore}
          value={score}
          onChange={(e) => {
            setScore(e.target.value);
            setSaved(false);
          }}
          className="h-8 w-20 text-right"
        />
        <span className="text-xs text-slate-400">/ {maxScore}</span>
        <Button
          size="sm"
          className="h-8 bg-emerald-600 hover:bg-emerald-700"
          disabled={grade.isPending || score === ""}
          onClick={() => grade.mutate()}
        >
          {grade.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Saqlash"}
        </Button>
      </div>
    </div>
  );
}
