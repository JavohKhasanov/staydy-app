export const ONBOARDING_GOALS = [
  "Ish topish",
  "Freelance ishlash",
  "Chet elga ketish",
  "Universitet yoki imtihon uchun tayyorlanish",
  "O'zini rivojlantirish",
  "Boshqa",
] as const;

export const WEEKLY_STUDY_HOURS = [
  "1-3 soat",
  "3-5 soat",
  "5-10 soat",
  "10+ soat",
] as const;

export const BIGGEST_OBSTACLES = [
  "Vaqt yetishmasligi",
  "Ish",
  "Oila",
  "Darslarni tushunmaslik",
  "Moliyaviy muammo",
  "Motivatsiya pastligi",
  "Boshqa",
] as const;

export const SCORE_1_5 = [1, 2, 3, 4, 5] as const;
export const SCORE_1_10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const ATTENDANCE_STATUSES = [
  { value: "PRESENT", label: "Kelgan" },
  { value: "ABSENT", label: "Kelmagan" },
  { value: "LATE", label: "Kechikkan" },
  { value: "EXCUSED", label: "Sababli" },
] as const;