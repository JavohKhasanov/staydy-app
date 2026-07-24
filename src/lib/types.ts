export type RiskLevel = "RED" | "YELLOW" | "GREEN" | "red" | "yellow" | "green";

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  organization: Organization;
}

export interface RiskFactor {
  key: string;
  label: string;
  weight: number;
  value?: number | string;
  severity?: RiskLevel;
}

export interface Student {
  id: string;
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
  course?: string;
  group?: string;
  groupId?: string;
  mentor?: string;
  mentorId?: string;
  branchId?: string;
  startDate?: string;
  goal?: string;
  sixMonthTarget?: string;
  weeklyStudyHours?: string;
  confidenceLevel?: number;
  motivationScore?: number;
  progressScore?: number;
  biggestObstacle?: string;
  riskScore?: number;
  riskLevel?: RiskLevel;
  riskFactors?: RiskFactor[];
}

export interface Survey {
  id: string;
  createdAt: string;
  weekNumber?: number;
  motivationScore: number;
  progressScore: number;
  confidenceLevel?: number;
  biggestObstacle?: string;
  note?: string;
}

export interface Attendance {
  id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | string;
  note?: string;
}

export interface Note {
  id: string;
  createdAt: string;
  author?: string;
  text: string;
}

export interface InterventionTask {
  id: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | string;
  createdAt: string;
  resolvedAt?: string;
  reasons?: string[];
  suggestedActions?: string[];
  student: { id: string; fullName: string };
  resolutionComment?: string;
  assignedTo?: string;
  assignedToName?: string;
}

export interface DashboardData {
  totals: {
    students: number;
    atRisk: number;
    red: number;
    yellow: number;
    green?: number;
  };
  motivationTrend: Array<{ date: string; score: number }>;
  groupsByRisk: Array<{ group: string; avgRisk: number; redCount: number }>;
  topObstacles: Array<{ label: string; count: number }>;
  riskiestStudents: Array<{
    id: string;
    fullName: string;
    group?: string;
    riskScore: number;
    riskLevel: RiskLevel;
  }>;
}

export interface Group {
  id: string;
  name: string;
  teacherId?: string;
  courseId?: string;
  branchId?: string;
  direction?: string;
  scheduleDays?: string; // canonical weekday codes: "mon,wed,fri"
  capacity?: number;
  startTime?: string; // "HH:MM"
  endTime?: string;
  roomId?: string;
  createdAt?: string;
}

export interface Teacher {
  id: string;
  email: string;
  fullName: string;
  role?: string;
  branchId?: string;
  createdAt?: string;
}

export interface Homework {
  id: string;
  date: string;
  isDone: boolean;
}

export interface ApiError {
  title?: string;
  status?: number;
  detail?: string;
  message?: string;
}

export interface Paginated<T> {
  items?: T[];
  data?: T[];
  total?: number;
}
