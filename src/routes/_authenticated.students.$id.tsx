import { useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Pencil, Sparkles, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";

import { extractApiError } from "@/lib/api";
import {
  addNote,
  assignStudentGroup,
  deleteStudent,
  getAiAdvice,
  getStudent,
  recordAdviceFeedback,
  listAttendance,
  listCourses,
  listGroups,
  listHomework,
  listNotes,
  listSurveys,
  recordAttendance,
  recordHomework,
  submitSurvey,
} from "@/lib/resources";
import type { Student } from "@/lib/types";
import { useSession } from "@/features/auth/useSession";
import { EnrollmentsSection } from "@/features/students/EnrollmentsSection";
import { FinanceSection } from "@/features/students/FinanceSection";
import { StudentEditDialog } from "@/features/students/StudentEditDialog";
import { ActivityTimeline } from "@/features/activities/ActivityTimeline";
import { CONTACT_LOG_ENABLED, MENTOR_ENABLED } from "@/lib/flags";
import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
import { TelegramLinkButton } from "@/features/students/TelegramLinkButton";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
import { ATTENDANCE_STATUSES, BIGGEST_OBSTACLES, SCORE_1_10, SCORE_1_5 } from "@/lib/enums";

export const Route = createFileRoute("/_authenticated/students/$id")({
  head: () => ({ meta: [{ title: "Talaba — Staydy" }] }),
  component: StudentDetailPage,
});

function StudentDetailPage() {
  const { id } = Route.useParams();
  const isTeacher = useSession().user?.role === "teacher";
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["student", id],
    queryFn: () => getStudent(id),
  });

  return (
    <div>
      <BackLink fallback={isTeacher ? "/me/students" : "/students"} />
      {isLoading && <LoadingBlock />}
      {isError && <ErrorBlock message={extractApiError(error)} onRetry={() => refetch()} />}
      {data && <StudentDetailContent student={data} />}
    </div>
  );
}

function StudentDetailContent({ student }: { student: Student }) {
  const isTeacher = useSession().user?.role === "teacher";
  const [editOpen, setEditOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const del = useMutation({
    mutationFn: () => deleteStudent(student.id),
    onSuccess: () => {
      toast.success("Talaba o'chirildi");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      navigate({ to: "/students" });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
  return (
    <div className="space-y-6">
      {!isTeacher && (
        <StudentEditDialog open={editOpen} onOpenChange={setEditOpen} student={student} />
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {student.fullName}
          </h1>
          <div className="text-sm text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
            {student.group && <span>{student.group}</span>}
            {student.course && <span>· {student.course}</span>}
            {student.phone && <span>· {student.phone}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isTeacher && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Tahrirlash
            </Button>
          )}
          {!isTeacher && (
            <Button
              variant="outline"
              size="sm"
              disabled={del.isPending}
              onClick={() => {
                if (window.confirm(`${student.fullName} va uning barcha yozuvlari o'chiriladi. Davom etasizmi?`)) {
                  del.mutate();
                }
              }}
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              {del.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1.5" />
              )}
              O'chirish
            </Button>
          )}
          <TelegramLinkButton studentId={student.id} />
          {student.riskScore != null && (
            <div className="text-right">
              <div className="text-xs text-slate-500">Xavf bali</div>
              <div className="text-2xl font-semibold tabular-nums text-slate-900">
                {student.riskScore.toFixed(0)}
              </div>
            </div>
          )}
          <RiskBadge level={student.riskLevel} />
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="surveys">So'rovnomalar</TabsTrigger>
          <TabsTrigger value="attendance">Davomat</TabsTrigger>
          <TabsTrigger value="homework">Uy vazifa</TabsTrigger>
          <TabsTrigger value="notes">Eslatmalar</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileTab student={student} />
        </TabsContent>
        <TabsContent value="surveys" className="mt-4">
          <SurveysTab studentId={student.id} />
        </TabsContent>
        <TabsContent value="attendance" className="mt-4">
          <AttendanceTab studentId={student.id} />
        </TabsContent>
        <TabsContent value="homework" className="mt-4">
          <HomeworkTab studentId={student.id} />
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <NotesTab studentId={student.id} />
        </TabsContent>
      </Tabs>

      <AiAdviceCard studentId={student.id} />
    </div>
  );
}

function AiAdviceCard({ studentId }: { studentId: string }) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [rated, setRated] = useState<"up" | "down" | null>(null);

  const mutation = useMutation({
    mutationFn: () => getAiAdvice(studentId),
    onSuccess: (d) => {
      setAdvice(d.advice);
      setUnavailable(false);
      setRated(null);
    },
    onError: (err) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 503) {
        setUnavailable(true);
        setAdvice(null);
      } else {
        toast.error(extractApiError(err));
      }
    },
  });

  const feedback = useMutation({
    mutationFn: (useful: boolean) => recordAdviceFeedback(studentId, useful),
    onSuccess: (_d, useful) => setRated(useful ? "up" : "down"),
    onError: (err) => toast.error(extractApiError(err)),
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          AI tavsiya
        </h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          {advice ? "Yangilash" : "Tavsiya olish"}
        </Button>
      </div>

      {mutation.isPending && !advice && (
        <p className="text-sm text-slate-500">AI tahlil qilmoqda...</p>
      )}
      {unavailable && (
        <p className="text-sm text-amber-600">
          AI hozir mavjud emas. Tez orada qayta urinib ko'ring.
        </p>
      )}
      {advice && <div className="text-sm leading-relaxed space-y-0.5">{renderAdvice(advice)}</div>}
      {advice && (
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-500">Bu tavsiya foydali bo'ldimi?</span>
          <button
            onClick={() => feedback.mutate(true)}
            disabled={feedback.isPending}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
              rated === "up"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <ThumbsUp className="h-3.5 w-3.5" /> Ha
          </button>
          <button
            onClick={() => feedback.mutate(false)}
            disabled={feedback.isPending}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
              rated === "down"
                ? "border-rose-300 bg-rose-50 text-rose-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <ThumbsDown className="h-3.5 w-3.5" /> Yo'q
          </button>
          {rated && <span className="text-xs text-slate-400">Rahmat!</span>}
        </div>
      )}
      {!advice && !unavailable && !mutation.isPending && (
        <p className="text-sm text-slate-500">
          Talabaning risk holatiga qarab amaliy tavsiya olish — tugmani bosing.
        </p>
      )}
    </div>
  );
}

// renderAdvice is a tiny markdown renderer (headings, bold, bullets) so the AI's Uzbek markdown
// looks clean without adding a markdown dependency.
function renderAdvice(md: string) {
  return md.split("\n").map((raw, i) => {
    const line = raw.trim();
    if (!line) return <div key={i} className="h-1.5" />;
    if (/^[-*_]{3,}$/.test(line)) return <hr key={i} className="my-2 border-slate-100" />;
    if (line.startsWith("#")) {
      return (
        <h4 key={i} className="mt-3 mb-1 font-semibold text-slate-900">
          {inlineBold(line.replace(/^#+\s*/, ""))}
        </h4>
      );
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      return (
        <li key={i} className="ml-5 list-disc text-slate-700">
          {inlineBold(line.slice(2))}
        </li>
      );
    }
    return (
      <p key={i} className="text-slate-700">
        {inlineBold(line)}
      </p>
    );
  });
}

function inlineBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="text-slate-900">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900 mt-0.5">
        {value != null && value !== "" ? value : "—"}
      </span>
    </div>
  );
}

function ProfileTab({ student }: { student: Student }) {
  const isTeacher = useSession().user?.role === "teacher";
  // Resolve the course through the student's group (the student's own legacy course field is
  // usually empty) — same rule as the students list.
  const groupsQ = useQuery({ queryKey: ["groups"], queryFn: listGroups, enabled: !isTeacher });
  const coursesQ = useQuery({ queryKey: ["courses"], queryFn: listCourses, enabled: !isTeacher });
  const groupCourseId = groupsQ.data?.find((g) => g.id === student.groupId)?.courseId;
  const courseName =
    (groupCourseId ? coursesQ.data?.find((c) => c.id === groupCourseId)?.name : undefined) ??
    student.course;
  return (
    <div className="space-y-4">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Profil ma'lumotlari</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoRow label="Email" value={student.email} />
          <InfoRow label="Telefon" value={student.phone} />
          <InfoRow label="Ikkinchi telefon" value={student.secondPhone} />
          <InfoRow label="Tug'ilgan sana" value={student.birthDate} />
          <InfoRow label="Jins" value={student.gender} />
          <InfoRow label="Ota-ona" value={student.parentName} />
          <InfoRow label="Ota-ona telefoni" value={student.parentPhone} />
          <InfoRow label="Manzil" value={student.address} />
          {MENTOR_ENABLED && <InfoRow label="Talaba kodi" value={student.studentCode} />}
          <InfoRow label="Holat" value={student.status} />
          <InfoRow label="Kurs" value={courseName} />
          <InfoRow label="Guruh" value={student.group} />
          {MENTOR_ENABLED && <InfoRow label="Mentor" value={student.mentor} />}
          <InfoRow label="Boshlangan sana" value={student.startDate} />
          <InfoRow label="Maqsad" value={student.goal} />
          <InfoRow label="6 oylik maqsad" value={student.sixMonthTarget} />
          <InfoRow label="Haftalik soatlar" value={student.weeklyStudyHours} />
          <InfoRow label="Ishonch darajasi" value={student.confidenceLevel} />
          <InfoRow label="Eng katta to'siq" value={student.biggestObstacle} />
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Xavf omillari</h2>
        {student.riskFactors?.length ? (
          <ul className="space-y-3">
            {student.riskFactors.map((f) => (
              <li key={f.key} className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">{f.label}</div>
                  {f.value != null && (
                    <div className="text-xs text-slate-500">{String(f.value)}</div>
                  )}
                </div>
                <span className="text-xs tabular-nums text-slate-500">{f.weight}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyBlock title="Xavf omillari yo'q" />
        )}
      </div>
      {!isTeacher && <GroupAssign student={student} />}
      </div>
      {!isTeacher && <EnrollmentsSection studentId={student.id} />}
      {!isTeacher && <FinanceSection studentId={student.id} />}
      {!isTeacher && CONTACT_LOG_ENABLED && (
        <ActivityTimeline subjectType="student" subjectId={student.id} />
      )}
    </div>
  );
}

function GroupAssign({ student }: { student: Student }) {
  const NONE = "__none__";
  const queryClient = useQueryClient();
  const groups = useQuery({ queryKey: ["groups"], queryFn: listGroups });
  const mutation = useMutation({
    mutationFn: (groupId: string | null) => assignStudentGroup(student.id, groupId),
    onSuccess: () => {
      toast.success("Guruh yangilandi");
      queryClient.invalidateQueries({ queryKey: ["student", student.id] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900 mb-3">Guruh</h2>
      <Select
        value={student.groupId ?? NONE}
        onValueChange={(v) => mutation.mutate(v === NONE ? null : v)}
        disabled={mutation.isPending}
      >
        <SelectTrigger>
          <SelectValue placeholder="Guruh tanlang" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Guruhsiz</SelectItem>
          {(groups.data ?? []).map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-slate-500 mt-2">
        Talabani guruhga biriktirish — ustoz va dashboard shu guruhni ko'radi.
      </p>
    </div>
  );
}

function SurveysTab({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient();
  const [motivationScore, setMotivation] = useState("");
  const [progressScore, setProgress] = useState("");
  const [confidenceLevel, setConfidence] = useState("");
  const [biggestObstacle, setObstacle] = useState("");
  const [note, setNote] = useState("");

  const list = useQuery({
    queryKey: ["student-surveys", studentId],
    queryFn: () => listSurveys(studentId),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await submitSurvey(studentId, {
        motivationScore: Number(motivationScore),
        progressScore: Number(progressScore),
        confidenceLevel: Number(confidenceLevel),
        biggestObstacle,
        note,
      });
    },
    onSuccess: () => {
      toast.success("So'rovnoma qo'shildi");
      queryClient.invalidateQueries({ queryKey: ["student-surveys", studentId] });
      queryClient.invalidateQueries({ queryKey: ["student", studentId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setMotivation("");
      setProgress("");
      setConfidence("");
      setObstacle("");
      setNote("");
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Yangi so'rovnoma">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-3"
        >
          <FormSelect
            label="Motivatsiya (1-5)"
            value={motivationScore}
            onChange={setMotivation}
            options={SCORE_1_5.map(String)}
            required
          />
          <FormSelect
            label="Progress (1-5)"
            value={progressScore}
            onChange={setProgress}
            options={SCORE_1_5.map(String)}
            required
          />
          <FormSelect
            label="Ishonch darajasi (1-10)"
            value={confidenceLevel}
            onChange={setConfidence}
            options={SCORE_1_10.map(String)}
            required
          />
          <FormSelect
            label="Eng katta to'siq"
            value={biggestObstacle}
            onChange={setObstacle}
            options={[...BIGGEST_OBSTACLES]}
          />
          <div className="space-y-1.5">
            <Label className="text-xs">Izoh</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Saqlash
          </Button>
        </form>
      </Card>
      <Card title="So'rovnomalar tarixi">
        {list.isLoading && <LoadingBlock />}
        {list.isError && (
          <ErrorBlock message={extractApiError(list.error)} onRetry={() => list.refetch()} />
        )}
        {list.data && list.data.length === 0 && <EmptyBlock title="So'rovnomalar yo'q" />}
        {list.data && list.data.length > 0 && (
          <ul className="divide-y divide-slate-100 max-h-[50vh] overflow-y-auto">
            {list.data.map((s) => (
              <li key={s.id} className="py-3 text-sm">
                <div className="flex justify-between items-start">
                  <div className="text-slate-600 text-xs">{formatDate(s.createdAt)}</div>
                  <div className="flex gap-3 text-xs tabular-nums">
                    <span>M: {s.motivationScore}</span>
                    <span>P: {s.progressScore}</span>
                    <span>I: {s.confidenceLevel}</span>
                  </div>
                </div>
                {s.biggestObstacle && (
                  <div className="text-slate-700 mt-1">{s.biggestObstacle}</div>
                )}
                {s.note && <div className="text-slate-500 mt-1 text-xs">{s.note}</div>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function AttendanceTab({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("PRESENT");
  const [note, setNote] = useState("");

  const list = useQuery({
    queryKey: ["student-attendance", studentId],
    queryFn: () => listAttendance(studentId),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await recordAttendance(studentId, { date, status, note });
    },
    onSuccess: () => {
      toast.success("Davomat saqlandi");
      queryClient.invalidateQueries({ queryKey: ["student-attendance", studentId] });
      queryClient.invalidateQueries({ queryKey: ["student", studentId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setNote("");
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Davomat qo'shish">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label className="text-xs">Sana</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Holat</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ATTENDANCE_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Izoh</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Saqlash
          </Button>
        </form>
      </Card>
      <Card title="Davomat tarixi">
        {list.isLoading && <LoadingBlock />}
        {list.isError && (
          <ErrorBlock message={extractApiError(list.error)} onRetry={() => list.refetch()} />
        )}
        {list.data && list.data.length === 0 && <EmptyBlock title="Davomat yozuvi yo'q" />}
        {list.data && list.data.length > 0 && (
          <ul className="divide-y divide-slate-100 max-h-[50vh] overflow-y-auto">
            {list.data.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-slate-700">{formatDate(a.date)}</span>
                <span
                  className={`text-xs font-medium ${
                    (
                      {
                        PRESENT: "text-emerald-600",
                        LATE: "text-amber-600",
                        EXCUSED: "text-sky-600",
                        ABSENT: "text-rose-600",
                      } as Record<string, string>
                    )[a.status] ?? "text-slate-600"
                  }`}
                >
                  {ATTENDANCE_STATUSES.find((s) => s.value === a.status)?.label ?? a.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function HomeworkTab({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [done, setDone] = useState("DONE");

  const list = useQuery({
    queryKey: ["student-homework", studentId],
    queryFn: () => listHomework(studentId),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await recordHomework(studentId, { date, isDone: done === "DONE" });
    },
    onSuccess: () => {
      toast.success("Uy vazifa saqlandi");
      queryClient.invalidateQueries({ queryKey: ["student-homework", studentId] });
      queryClient.invalidateQueries({ queryKey: ["student", studentId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Uy vazifa belgilash">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label className="text-xs">Sana</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Holat</Label>
            <Select value={done} onValueChange={setDone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DONE">Bajardi</SelectItem>
                <SelectItem value="NOT_DONE">Bajarmadi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Saqlash
          </Button>
        </form>
      </Card>
      <Card title="Uy vazifa tarixi">
        {list.isLoading && <LoadingBlock />}
        {list.isError && (
          <ErrorBlock message={extractApiError(list.error)} onRetry={() => list.refetch()} />
        )}
        {list.data && list.data.length === 0 && <EmptyBlock title="Uy vazifa yozuvi yo'q" />}
        {list.data && list.data.length > 0 && (
          <ul className="divide-y divide-slate-100 max-h-[50vh] overflow-y-auto">
            {list.data.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-slate-700">{formatDate(h.date)}</span>
                <span
                  className={`text-xs font-medium ${h.isDone ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {h.isDone ? "Bajardi" : "Bajarmadi"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function NotesTab({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");

  const list = useQuery({
    queryKey: ["student-notes", studentId],
    queryFn: () => listNotes(studentId),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await addNote(studentId, text);
    },
    onSuccess: () => {
      toast.success("Eslatma qo'shildi");
      queryClient.invalidateQueries({ queryKey: ["student-notes", studentId] });
      setText("");
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Yangi eslatma">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            mutation.mutate();
          }}
          className="space-y-3"
        >
          <Textarea
            placeholder="Eslatma matnini kiriting..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            required
          />
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Saqlash
          </Button>
        </form>
      </Card>
      <Card title="Eslatmalar">
        {list.isLoading && <LoadingBlock />}
        {list.isError && (
          <ErrorBlock message={extractApiError(list.error)} onRetry={() => list.refetch()} />
        )}
        {list.data && list.data.length === 0 && <EmptyBlock title="Eslatmalar yo'q" />}
        {list.data && list.data.length > 0 && (
          <ul className="space-y-3">
            {list.data.map((n) => (
              <li key={n.id} className="border border-slate-200 rounded-lg p-3 text-sm">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{n.author ?? "—"}</span>
                  <span>{formatDate(n.createdAt)}</span>
                </div>
                <p className="text-slate-700 whitespace-pre-wrap">{n.text}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Tanlang" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function formatDate(d?: string): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

// PageHeader imported above is unused; remove to avoid lint.
void PageHeader;


// BackLink returns to wherever the user came from (Vazifalar, a group page, the students list)
// and falls back to the list when there is no history (direct link / new tab).
function BackLink({ fallback }: { fallback: "/students" | "/me/students" }) {
  const router = useRouter();
  const navigate = useNavigate();
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.history.back();
    else navigate({ to: fallback });
  };
  return (
    <button
      onClick={goBack}
      className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4"
    >
      <ArrowLeft className="h-4 w-4 mr-1" />
      Orqaga
    </button>
  );
}
