// Adapter layer between the Go backend's JSON shapes and the frontend's types.
//
// The backend is the source of truth; its field names differ from the UI's (e.g. `name` vs
// `fullName`, `riskTier` vs `riskLevel`, flat dashboard counts vs nested `totals`). Every API
// call goes through a function here so the mapping lives in ONE place and the components stay
// unchanged. Backend contract: see PROJECT.md §3.

import { api } from "./api";
import { authStore } from "./auth";
import type {
  Attendance,
  DashboardData,
  Group,
  Homework,
  InterventionTask,
  Note,
  RiskFactor,
  RiskLevel,
  Student,
  Survey,
  Teacher,
} from "./types";

function unwrapList<T>(d: unknown): T[] {
  if (Array.isArray(d)) return d as T[];
  const o = d as { items?: T[]; data?: T[] } | null | undefined;
  return o?.items ?? o?.data ?? [];
}

// --- response mappers (backend -> frontend) ---

type RawStudent = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  gender?: string;
  secondPhone?: string;
  address?: string;
  parentName?: string;
  parentPhone?: string;
  studentCode?: string;
  status?: string;
  courseName?: string;
  groupName?: string;
  groupId?: string;
  mentorName?: string;
  mentorId?: string;
  branchId?: string;
  startDate?: string;
  onboardingGoal?: string;
  sixMonthTarget?: string;
  weeklyStudyHours?: string;
  confidenceLevel?: number;
  riskScore?: number;
  riskTier?: string;
};

function mapStudent(s: RawStudent): Student {
  return {
    id: s.id,
    fullName: s.name,
    phone: s.phone,
    email: s.email,
    birthDate: s.birthDate,
    gender: s.gender,
    secondPhone: s.secondPhone,
    address: s.address,
    parentName: s.parentName,
    parentPhone: s.parentPhone,
    studentCode: s.studentCode,
    status: s.status,
    course: s.courseName,
    group: s.groupName,
    groupId: s.groupId,
    mentor: s.mentorName,
    mentorId: s.mentorId,
    branchId: s.branchId,
    startDate: s.startDate,
    goal: s.onboardingGoal,
    sixMonthTarget: s.sixMonthTarget,
    weeklyStudyHours: s.weeklyStudyHours,
    confidenceLevel: s.confidenceLevel,
    riskScore: s.riskScore,
    // RiskBadge.normalizeRisk() lowercases, so the backend's "Red"/"Yellow"/"Green" works as-is.
    riskLevel: s.riskTier as RiskLevel | undefined,
  };
}

function mapRiskFactor(f: { label: string; points: number }, i: number): RiskFactor {
  return { key: f.label || String(i), label: f.label, weight: f.points };
}

type RawSurvey = {
  id: string;
  weekNumber: number;
  motivationScore: number;
  progressScore: number;
  biggestObstacle?: string;
  comment?: string;
  submittedAt: string;
};

function mapSurvey(s: RawSurvey): Survey {
  return {
    id: s.id,
    createdAt: s.submittedAt,
    weekNumber: s.weekNumber,
    motivationScore: s.motivationScore,
    progressScore: s.progressScore,
    biggestObstacle: s.biggestObstacle,
    note: s.comment,
  };
}

function mapAttendance(a: { id: string; date: string; isPresent: boolean; status?: string }): Attendance {
  // Backend now returns a granular status (present|absent|late|excused); fall back to the legacy
  // isPresent boolean for older payloads.
  const status = a.status ? a.status.toUpperCase() : a.isPresent ? "PRESENT" : "ABSENT";
  return { id: a.id, date: a.date, status };
}

function mapNote(n: { id: string; author?: string; text: string; createdAt: string }): Note {
  return { id: n.id, author: n.author, text: n.text, createdAt: n.createdAt };
}

const TASK_STATUS: Record<string, InterventionTask["status"]> = {
  Open: "OPEN",
  "In Progress": "IN_PROGRESS",
  Resolved: "RESOLVED",
};

function mapTask(t: {
  id: string;
  studentId: string;
  studentName: string;
  reasons?: string[];
  status: string;
  resolutionComment?: string;
  createdAt: string;
  resolvedAt?: string;
}): InterventionTask {
  return {
    id: t.id,
    status: TASK_STATUS[t.status] ?? (t.status as InterventionTask["status"]),
    createdAt: t.createdAt,
    resolvedAt: t.resolvedAt,
    reasons: t.reasons ?? [],
    student: { id: t.studentId, fullName: t.studentName },
    resolutionComment: t.resolutionComment,
  };
}

// --- students ---

export async function listStudents(): Promise<Student[]> {
  const res = await api.get("/students");
  return unwrapList<RawStudent>(res.data).map(mapStudent);
}

type RawStudentDetail = {
  student: RawStudent;
  surveys?: RawSurvey[];
  attendance?: { id: string; date: string; isPresent: boolean; status?: string }[];
  homework?: { id: string; date: string; isDone: boolean }[];
  notes?: { id: string; author?: string; text: string; createdAt: string }[];
  riskFactors?: { label: string; points: number }[];
};

async function getDetail(id: string): Promise<RawStudentDetail> {
  const res = await api.get<RawStudentDetail>(`/students/${id}`);
  return res.data;
}

export async function getStudent(id: string): Promise<Student> {
  const d = await getDetail(id);
  const st = mapStudent(d.student);
  st.riskFactors = (d.riskFactors ?? []).map(mapRiskFactor);
  return st;
}

// Sub-resources are read from the single detail response (the backend bundles them there),
// so no extra endpoints are needed and each tab stays independently refetchable.
export async function listSurveys(id: string): Promise<Survey[]> {
  return (await getDetail(id)).surveys?.map(mapSurvey) ?? [];
}
export async function listAttendance(id: string): Promise<Attendance[]> {
  return (await getDetail(id)).attendance?.map(mapAttendance) ?? [];
}
export async function listNotes(id: string): Promise<Note[]> {
  return (await getDetail(id)).notes?.map(mapNote) ?? [];
}

// --- mutations (frontend form -> backend request) ---

export interface SurveyForm {
  motivationScore: number;
  progressScore: number;
  confidenceLevel?: number; // collected by the UI but not stored by the backend
  biggestObstacle?: string;
  note?: string;
}

export async function submitSurvey(studentId: string, form: SurveyForm): Promise<void> {
  // The backend keys surveys by week. The UI has no week field, so derive the next week number
  // from existing surveys (first check-in = week 1).
  const surveys = await listSurveys(studentId);
  const nextWeek = surveys.length ? Math.max(...surveys.map((s) => s.weekNumber ?? 0)) + 1 : 1;
  await api.post(`/students/${studentId}/surveys`, {
    weekNumber: nextWeek,
    motivationScore: form.motivationScore,
    progressScore: form.progressScore,
    biggestObstacle: form.biggestObstacle || undefined,
    comment: form.note || undefined,
  });
}

// Teachers can only mark via the ownership-checked /me/* path (the center_admin path 403s for
// them); admins use the direct path. isTeacher() reads the role cached in the session.
function isTeacher(): boolean {
  return authStore.getUser()?.role === "teacher";
}

// Session topic: what was taught for a group on a date, saved alongside attendance.
export async function getSessionTopic(groupId: string, date: string): Promise<string> {
  const res = await api.get("/lessons/session", { params: { groupId, date } });
  return (res.data?.topic as string) ?? "";
}

export async function saveSessionTopic(groupId: string, date: string, topic: string): Promise<void> {
  await api.post("/lessons/session", { groupId, date, topic });
}

export async function recordAttendance(
  studentId: string,
  input: { date: string; status: string; note?: string },
): Promise<void> {
  const path = isTeacher()
    ? `/me/students/${studentId}/attendance`
    : `/students/${studentId}/attendance`;
  // Backend now accepts a granular status (present|absent|late|excused); is_present is derived
  // server-side, so late/excused don't lower the risk-facing attendance rate.
  await api.post(path, { date: input.date, status: input.status.toLowerCase() });
}

export async function addNote(studentId: string, text: string): Promise<void> {
  await api.post(`/students/${studentId}/notes`, { text });
}

export interface NewStudentForm {
  fullName: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  gender?: string;
  secondPhone?: string;
  address?: string;
  parentName?: string;
  parentPhone?: string;
  studentCode?: string;
  status?: string;
  mentorId?: string;
  branchId?: string;
  course?: string;
  group?: string;
  mentor?: string;
  onboardingGoal?: string;
  sixMonthTarget?: string;
  weeklyStudyHours?: string;
  biggestObstacle?: string;
  confidenceLevel?: number;
}

// The CRM profile fields shared by create + update (legacy course/group/mentor are create-only).
function studentProfileBody(form: NewStudentForm) {
  return {
    name: form.fullName,
    phone: form.phone || undefined,
    email: form.email || undefined,
    birthDate: form.birthDate || undefined,
    gender: form.gender || undefined,
    secondPhone: form.secondPhone || undefined,
    address: form.address || undefined,
    parentName: form.parentName || undefined,
    parentPhone: form.parentPhone || undefined,
    studentCode: form.studentCode || undefined,
    status: form.status || undefined,
    mentorId: form.mentorId || undefined,
    branchId: form.branchId ?? undefined,
    onboardingGoal: form.onboardingGoal || undefined,
    sixMonthTarget: form.sixMonthTarget || undefined,
    weeklyStudyHours: form.weeklyStudyHours || undefined,
    confidenceLevel: form.confidenceLevel ?? 5, // backend requires 1..10
  };
}

// Returns the new student's id so the caller can assign a group (via assignStudentGroup).
export async function createStudent(form: NewStudentForm): Promise<string> {
  const res = await api.post<{ id: string }>("/students", studentProfileBody(form));
  return res.data.id;
}

export async function deleteStudent(id: string): Promise<void> {
  await api.delete(`/students/${id}`);
}

export async function updateStudent(id: string, form: NewStudentForm): Promise<void> {
  await api.put(`/students/${id}`, studentProfileBody(form));
}

// --- intervention tasks ---

export async function listTasks(): Promise<InterventionTask[]> {
  const res = await api.get("/intervention-tasks");
  return unwrapList<Parameters<typeof mapTask>[0]>(res.data).map(mapTask);
}

export async function startTask(id: string): Promise<void> {
  await api.post(`/intervention-tasks/${id}/start`);
}

export async function resolveTask(id: string, resolutionComment: string): Promise<void> {
  await api.post(`/intervention-tasks/${id}/resolve`, { resolutionComment });
}

// --- telegram ---

export interface TelegramLink {
  link: string;
  token: string;
  expiresAt: string;
}

export async function createTelegramLink(studentId: string): Promise<TelegramLink> {
  const res = await api.post<TelegramLink>(`/students/${studentId}/telegram-link`);
  return res.data;
}

// --- dashboard ---

type RawDashboard = {
  total: number;
  atRisk: number;
  red: number;
  yellow: number;
  green: number;
  groups?: { group: string; studentCount: number; avgRisk: number }[];
  obstacles?: { obstacle: string; count: number }[];
  highRisk?: RawStudent[];
  motivationByWeek?: { week: number; avgMotivation: number }[];
};

export async function getDashboard(): Promise<DashboardData> {
  const res = await api.get<RawDashboard>("/dashboard");
  const d = res.data;
  return {
    totals: {
      students: d.total,
      atRisk: d.atRisk,
      red: d.red,
      yellow: d.yellow,
      green: d.green,
    },
    motivationTrend: (d.motivationByWeek ?? []).map((m) => ({
      date: `${m.week}-hafta`,
      score: m.avgMotivation,
    })),
    groupsByRisk: (d.groups ?? []).map((g) => ({
      group: g.group,
      avgRisk: g.avgRisk,
      redCount: 0, // backend doesn't yet return a per-group red count
    })),
    topObstacles: (d.obstacles ?? []).map((o) => ({ label: o.obstacle, count: o.count })),
    riskiestStudents: (d.highRisk ?? []).map((s) => ({
      id: s.id,
      fullName: s.name,
      group: s.groupName,
      riskScore: s.riskScore ?? 0,
      riskLevel: (s.riskTier ?? "Green") as RiskLevel,
    })),
  };
}

// --- groups (center_admin) ---

type RawGroup = {
  id: string;
  name: string;
  teacherId?: string;
  courseId?: string;
  branchId?: string;
  direction?: string;
  scheduleDays?: string;
  capacity?: number;
  startTime?: string;
  endTime?: string;
  roomId?: string;
  createdAt?: string;
};

function mapGroup(g: RawGroup): Group {
  return {
    id: g.id,
    name: g.name,
    teacherId: g.teacherId,
    courseId: g.courseId,
    branchId: g.branchId,
    direction: g.direction,
    scheduleDays: g.scheduleDays,
    capacity: g.capacity,
    startTime: g.startTime,
    endTime: g.endTime,
    roomId: g.roomId,
    createdAt: g.createdAt,
  };
}

export async function listGroups(): Promise<Group[]> {
  const res = await api.get("/groups");
  return unwrapList<RawGroup>(res.data).map(mapGroup);
}

// Groups scheduled today with no attendance recorded yet (the dashboard warning).
export async function listMissingAttendance(): Promise<Group[]> {
  const res = await api.get("/groups/attendance-missing");
  return unwrapList<RawGroup>(res.data).map(mapGroup);
}

export async function getGroup(id: string): Promise<Group> {
  const res = await api.get(`/groups/${id}`);
  return mapGroup(res.data as RawGroup);
}

export interface NewGroupForm {
  name: string;
  teacherId?: string;
  courseId?: string;
  branchId?: string;
  direction?: string;
  scheduleDays?: string;
  capacity?: number;
  startTime?: string;
  endTime?: string;
  roomId?: string;
}

function groupBody(form: NewGroupForm) {
  return {
    name: form.name,
    teacherId: form.teacherId || undefined,
    courseId: form.courseId || undefined,
    branchId: form.branchId ?? undefined,
    direction: form.direction || undefined,
    scheduleDays: form.scheduleDays || undefined,
    capacity: form.capacity || undefined,
    startTime: form.startTime || undefined,
    endTime: form.endTime || undefined,
    roomId: form.roomId || undefined,
  };
}

export async function createGroup(form: NewGroupForm): Promise<void> {
  await api.post("/groups", groupBody(form));
}

export async function updateGroup(id: string, form: NewGroupForm): Promise<void> {
  await api.put(`/groups/${id}`, groupBody(form));
}

export async function deleteGroup(id: string): Promise<void> {
  await api.delete(`/groups/${id}`);
}

export async function listGroupStudents(groupId: string): Promise<Student[]> {
  const res = await api.get(`/groups/${groupId}/students`);
  return unwrapList<RawStudent>(res.data).map(mapStudent);
}

// Assign (or clear, when groupId is null) a student's group.
export async function assignStudentGroup(studentId: string, groupId: string | null): Promise<void> {
  await api.put(`/students/${studentId}/group`, { groupId: groupId || undefined });
}

// --- teachers (center_admin) ---

type RawTeacher = {
  id: string;
  email: string;
  fullName: string;
  role?: string;
  createdAt?: string;
};

function mapTeacher(t: RawTeacher): Teacher {
  return { id: t.id, email: t.email, fullName: t.fullName, role: t.role, createdAt: t.createdAt };
}

export async function listTeachers(): Promise<Teacher[]> {
  const res = await api.get("/teachers");
  return unwrapList<RawTeacher>(res.data).map(mapTeacher);
}

export interface NewTeacherForm {
  fullName: string;
  email: string;
  password: string;
}

export async function createTeacher(form: NewTeacherForm): Promise<void> {
  await api.post("/teachers", {
    fullName: form.fullName,
    email: form.email,
    password: form.password,
  });
}

export async function updateTeacher(id: string, form: { fullName: string; email: string }): Promise<void> {
  await api.put(`/teachers/${id}`, { fullName: form.fullName, email: form.email });
}

export async function setTeacherPassword(id: string, password: string): Promise<void> {
  await api.put(`/teachers/${id}/password`, { password });
}

export async function deleteTeacher(id: string): Promise<void> {
  await api.delete(`/teachers/${id}`);
}

// --- homework (read from the bundled student detail; record like attendance) ---

export async function listHomework(id: string): Promise<Homework[]> {
  return (
    (await getDetail(id)).homework?.map((h) => ({ id: h.id, date: h.date, isDone: h.isDone })) ?? []
  );
}

export async function recordHomework(
  studentId: string,
  input: { date: string; isDone: boolean },
): Promise<void> {
  const path = isTeacher()
    ? `/me/students/${studentId}/homework`
    : `/students/${studentId}/homework`;
  await api.post(path, { date: input.date, isDone: input.isDone });
}

// --- AI advice (Gemini, via the backend) ---

export interface AiAdvice {
  advice: string; // Uzbek markdown: risk reasons / recommended actions / conversation opener
  generatedAt: string;
  cached: boolean;
}

// Generates a mentor recommendation for the student. Throws on 503 (AI unavailable) — the caller
// shows a "tez orada" message.
export async function getAiAdvice(studentId: string): Promise<AiAdvice> {
  const res = await api.post<AiAdvice>(`/students/${studentId}/ai-advice`);
  return res.data;
}

// Records whether the mentor found the AI advice useful (one rating per mentor per student).
export async function recordAdviceFeedback(studentId: string, useful: boolean): Promise<void> {
  await api.post(`/students/${studentId}/ai-advice/feedback`, { useful });
}

// --- bulk import (CRM-with mode) ---

export interface ImportRow {
  name: string;
  date: string; // YYYY-MM-DD
  present?: boolean;
  homeworkDone?: boolean;
}

export interface ImportResult {
  imported: number;
  skipped: { name: string; reason: string }[];
}

export async function importRecords(rows: ImportRow[]): Promise<ImportResult> {
  const res = await api.post<ImportResult>("/import/records", { rows });
  return res.data;
}

// --- teacher's own dashboard (/me/*, teacher-role only) ---

export async function listMyGroups(): Promise<Group[]> {
  const res = await api.get("/me/groups");
  return unwrapList<RawGroup>(res.data).map(mapGroup);
}

export async function listMyStudents(): Promise<Student[]> {
  const res = await api.get("/me/students");
  return unwrapList<RawStudent>(res.data).map(mapStudent);
}

// --- obstacle options (center-configurable check-in choices) ---

export interface ObstacleOption {
  id: string;
  label: string;
}

// The built-in default set (mirrors the backend) — offered as a starting point when a center has
// configured nothing yet.
export const DEFAULT_OBSTACLES = [
  "Vaqt yetishmasligi",
  "Ish",
  "Oila",
  "Darslarni tushunmaslik",
  "Moliyaviy muammo",
  "Motivatsiya pastligi",
  "Boshqa",
];

export async function listObstacleOptions(): Promise<ObstacleOption[]> {
  const res = await api.get("/obstacle-options");
  return unwrapList<ObstacleOption>(res.data);
}

export async function createObstacleOption(label: string): Promise<ObstacleOption> {
  const res = await api.post<ObstacleOption>("/obstacle-options", { label });
  return res.data;
}

export async function deleteObstacleOption(id: string): Promise<void> {
  await api.delete(`/obstacle-options/${id}`);
}

// --- courses (CRM academic structure: the sellable programs) ---

export interface Course {
  id: string;
  name: string;
  level: string;
  price: number; // whole UZS so'm
  durationWeeks: number;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface CourseForm {
  name: string;
  level?: string;
  price?: number;
  durationWeeks?: number;
  description?: string;
  isActive?: boolean;
}

export async function listCourses(): Promise<Course[]> {
  const res = await api.get("/courses");
  return unwrapList<Course>(res.data);
}

export async function createCourse(form: CourseForm): Promise<Course> {
  const res = await api.post<Course>("/courses", form);
  return res.data;
}

export async function updateCourse(id: string, form: CourseForm): Promise<Course> {
  const res = await api.put<Course>(`/courses/${id}`, form);
  return res.data;
}

export async function deleteCourse(id: string): Promise<void> {
  await api.delete(`/courses/${id}`);
}

// --- enrollments (student lifecycle in a group/course) ---

export interface Enrollment {
  id: string;
  studentId: string;
  groupId?: string;
  courseId?: string;
  status: string; // active | completed | dropped | frozen
  startDate?: string; // YYYY-MM-DD
  endDate?: string;
  price: number;
  discount: number;
  createdAt: string;
}

export interface EnrollmentForm {
  groupId?: string;
  courseId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  price?: number;
  discount?: number;
}

export async function listEnrollments(studentId: string): Promise<Enrollment[]> {
  const res = await api.get(`/students/${studentId}/enrollments`);
  return unwrapList<Enrollment>(res.data);
}

export async function createEnrollment(
  studentId: string,
  form: EnrollmentForm,
): Promise<Enrollment> {
  const res = await api.post<Enrollment>(`/students/${studentId}/enrollments`, form);
  return res.data;
}

export async function updateEnrollment(id: string, form: EnrollmentForm): Promise<Enrollment> {
  const res = await api.put<Enrollment>(`/enrollments/${id}`, form);
  return res.data;
}

export async function deleteEnrollment(id: string): Promise<void> {
  await api.delete(`/enrollments/${id}`);
}

// --- finance (manual ledger: invoices + payments) ---

export interface Invoice {
  id: string;
  studentId: string;
  amount: number;
  paidAmount: number;
  balance: number;
  status: string; // unpaid | partial | paid | overdue
  dueDate?: string;
  period: string;
  note: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  studentId: string;
  amount: number;
  method: string; // cash | card | transfer
  note: string;
  paidAt: string;
}

export interface StudentFinance {
  balance: number;
  invoices: Invoice[];
  payments: Payment[];
}

export interface FinanceSummary {
  todayIncome: number;
  monthIncome: number;
  totalDebt: number;
  todayExpense: number;
  monthExpense: number;
  monthProfit: number;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  spentAt: string;
  note?: string;
}
export interface ExpensesList {
  expenses: Expense[];
  total: number;
  byCategory: { category: string; total: number }[];
}

export interface Debtor {
  studentId: string;
  name: string;
  balance: number;
}

export async function getStudentFinance(studentId: string): Promise<StudentFinance> {
  const res = await api.get<StudentFinance>(`/students/${studentId}/finance`);
  return res.data;
}

// Group roster billing state for a month: invoiced/paid per student.
export interface GroupFinanceRow {
  studentId: string;
  name: string;
  invoiced: number;
  paid: number;
}
export async function getGroupFinance(
  groupId: string,
  month?: string,
): Promise<{ period: string; students: GroupFinanceRow[] }> {
  const res = await api.get(`/groups/${groupId}/finance`, { params: { month } });
  return {
    period: res.data?.period ?? "",
    students: res.data?.students ?? [],
  };
}

export async function createInvoice(
  studentId: string,
  body: { amount: number; dueDate?: string; period?: string; note?: string; enrollmentId?: string },
): Promise<Invoice> {
  const res = await api.post<Invoice>(`/students/${studentId}/invoices`, body);
  return res.data;
}

export async function deleteInvoice(id: string): Promise<void> {
  await api.delete(`/invoices/${id}`);
}

export async function recordPayment(
  invoiceId: string,
  body: { amount: number; method?: string; paidAt?: string; note?: string },
): Promise<Payment> {
  const res = await api.post<Payment>(`/invoices/${invoiceId}/payments`, body);
  return res.data;
}

export async function refundPayment(
  invoiceId: string,
  body: { amount: number; method?: string; note?: string },
): Promise<Payment> {
  const res = await api.post<Payment>(`/invoices/${invoiceId}/refund`, body);
  return res.data;
}

export async function deletePayment(id: string): Promise<void> {
  await api.delete(`/payments/${id}`);
}

export async function getFinanceSummary(): Promise<FinanceSummary> {
  const res = await api.get<FinanceSummary>("/finance/summary");
  return res.data;
}

export async function getDebtors(): Promise<Debtor[]> {
  const res = await api.get("/finance/debtors");
  return unwrapList<Debtor>(res.data);
}

export async function listExpenses(from?: string, to?: string): Promise<ExpensesList> {
  const res = await api.get<ExpensesList>("/finance/expenses", { params: { from, to } });
  const d = res.data;
  // Backend sends null (not []) for empty slices; guard so the finance page doesn't crash.
  return {
    expenses: d?.expenses ?? [],
    total: d?.total ?? 0,
    byCategory: d?.byCategory ?? [],
  };
}
export async function createExpense(body: {
  category: string;
  amount: number;
  spentAt?: string;
  note?: string;
}): Promise<void> {
  await api.post("/finance/expenses", body);
}
export async function deleteExpense(id: string): Promise<void> {
  await api.delete(`/finance/expenses/${id}`);
}

// --- teacher payroll ---

export type SalaryKind = "fixed" | "per_lesson" | "per_student" | "percent_revenue";
export interface SalaryRule {
  teacherId: string;
  kind: SalaryKind;
  rate: number;
}
export interface SalaryBasis {
  kind: SalaryKind;
  rate: number;
  lessons: number;
  students: number;
  revenue: number;
  gross: number;
}
export interface SalarySlip {
  id: string;
  teacherId: string;
  teacherName?: string;
  periodStart: string;
  periodEnd: string;
  gross: number;
  bonus: number;
  deduction: number;
  net: number;
  status: string;
  note?: string;
  paidAt?: string;
}

export async function getSalaryRule(teacherId: string): Promise<SalaryRule> {
  const res = await api.get<SalaryRule>(`/teachers/${teacherId}/salary-rule`);
  return res.data;
}
export async function setSalaryRule(
  teacherId: string,
  body: { kind: SalaryKind; rate: number },
): Promise<void> {
  await api.put(`/teachers/${teacherId}/salary-rule`, body);
}
export async function previewSalary(
  teacherId: string,
  from?: string,
  to?: string,
): Promise<SalaryBasis> {
  const res = await api.get<SalaryBasis>(`/teachers/${teacherId}/salary/preview`, {
    params: { from, to },
  });
  return res.data;
}
export async function listSalarySlips(from?: string, to?: string): Promise<SalarySlip[]> {
  const res = await api.get("/salary-slips", { params: { from, to } });
  return unwrapList<SalarySlip>(res.data);
}
export async function createSalarySlip(body: {
  teacherId: string;
  periodStart: string;
  periodEnd: string;
  gross: number;
  bonus?: number;
  deduction?: number;
  note?: string;
}): Promise<{ id: string }> {
  const res = await api.post("/salary-slips", body);
  return res.data as { id: string };
}
export async function paySalarySlip(id: string): Promise<void> {
  await api.patch(`/salary-slips/${id}/pay`);
}
export async function deleteSalarySlip(id: string): Promise<void> {
  await api.delete(`/salary-slips/${id}`);
}

// --- branches (filiallar) ---

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
}
export async function listBranches(): Promise<Branch[]> {
  const res = await api.get("/branches");
  return unwrapList<Branch>(res.data);
}
export async function createBranch(body: {
  name: string;
  address?: string;
  phone?: string;
}): Promise<void> {
  await api.post("/branches", body);
}
export async function updateBranch(
  id: string,
  body: { name: string; address?: string; phone?: string; isActive: boolean },
): Promise<void> {
  await api.put(`/branches/${id}`, body);
}
export async function deleteBranch(id: string): Promise<void> {
  await api.delete(`/branches/${id}`);
}

// --- leads (sales funnel) ---

export interface Lead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  source?: string;
  stage: string; // new | contacted | trial | enrolled | lost
  interest?: string;
  note?: string;
  assignedTo?: string;
  studentId?: string;
  createdAt: string;
}

export interface LeadForm {
  name: string;
  phone?: string;
  email?: string;
  source?: string;
  stage?: string;
  interest?: string;
  note?: string;
}

export async function listLeads(): Promise<Lead[]> {
  const res = await api.get("/leads");
  return unwrapList<Lead>(res.data);
}

export async function createLead(form: LeadForm): Promise<Lead> {
  const res = await api.post<Lead>("/leads", form);
  return res.data;
}

export async function updateLead(id: string, form: LeadForm): Promise<Lead> {
  const res = await api.put<Lead>(`/leads/${id}`, form);
  return res.data;
}

export async function setLeadStage(id: string, stage: string): Promise<void> {
  await api.put(`/leads/${id}/stage`, { stage });
}

export async function convertLead(id: string): Promise<{ studentId: string }> {
  const res = await api.post<{ studentId: string }>(`/leads/${id}/convert`);
  return res.data;
}

export async function deleteLead(id: string): Promise<void> {
  await api.delete(`/leads/${id}`);
}

// --- activities (polymorphic communication timeline on a lead or student) ---

export interface Activity {
  id: string;
  subjectType: string;
  subjectId: string;
  type: string; // note | call | sms | meeting
  body: string;
  author?: string;
  createdAt: string;
}

export async function listActivities(subjectType: string, subjectId: string): Promise<Activity[]> {
  const res = await api.get("/activities", { params: { subjectType, subjectId } });
  return unwrapList<Activity>(res.data);
}

export async function createActivity(input: {
  subjectType: string;
  subjectId: string;
  type?: string;
  body: string;
}): Promise<Activity> {
  const res = await api.post<Activity>("/activities", input);
  return res.data;
}

export async function deleteActivity(id: string): Promise<void> {
  await api.delete(`/activities/${id}`);
}

// --- lessons (class timetable) ---

export interface Lesson {
  id: string;
  groupId?: string;
  teacherId?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  roomId?: string;
  topic?: string;
  status: string; // scheduled | done | cancelled
}

export interface LessonForm {
  groupId?: string;
  teacherId?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  roomId?: string;
  topic?: string;
  status?: string;
}

// --- rooms (xonalar) ---

export interface Room {
  id: string;
  branchId?: string;
  name: string;
  capacity: number;
}
export async function listRooms(): Promise<Room[]> {
  const res = await api.get("/rooms");
  return unwrapList<Room>(res.data);
}
export async function createRoom(body: {
  name: string;
  branchId?: string;
  capacity?: number;
}): Promise<void> {
  await api.post("/rooms", body);
}
export async function updateRoom(
  id: string,
  body: { name: string; branchId?: string; capacity?: number },
): Promise<void> {
  await api.put(`/rooms/${id}`, body);
}
export async function deleteRoom(id: string): Promise<void> {
  await api.delete(`/rooms/${id}`);
}

export async function listLessons(from?: string, to?: string): Promise<Lesson[]> {
  const res = await api.get("/lessons", { params: { from, to } });
  return unwrapList<Lesson>(res.data);
}

export async function createLesson(form: LessonForm): Promise<Lesson> {
  const res = await api.post<Lesson>("/lessons", form);
  return res.data;
}

export async function updateLesson(id: string, form: LessonForm): Promise<Lesson> {
  const res = await api.put<Lesson>(`/lessons/${id}`, form);
  return res.data;
}

export async function deleteLesson(id: string): Promise<void> {
  await api.delete(`/lessons/${id}`);
}
