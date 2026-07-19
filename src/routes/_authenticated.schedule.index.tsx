import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Clock, MapPin, User } from "lucide-react";

import { extractApiError } from "@/lib/api";
import { listGroups, listRooms, listTeachers } from "@/lib/resources";
import type { Group } from "@/lib/types";
import { WEEKDAYS, parseDays, matchesParity } from "@/lib/weekdays";
import { useBranch } from "@/features/branches/BranchContext";
import { PageHeader } from "@/components/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/schedule/")({
  head: () => ({ meta: [{ title: "Jadval — Staydy" }] }),
  component: SchedulePage,
});

type Parity = "all" | "odd" | "even";
const PARITY_TABS: { value: Parity; label: string }[] = [
  { value: "all", label: "Barchasi" },
  { value: "odd", label: "Toq kunlar" },
  { value: "even", label: "Juft kunlar" },
];

const todayCode = () => WEEKDAYS[(new Date().getDay() + 6) % 7].code; // JS Sun=0 -> our Mon-first

function SchedulePage() {
  const [parity, setParity] = useState<Parity>("all");
  const { branchId } = useBranch();

  const groupsQ = useQuery({ queryKey: ["groups"], queryFn: listGroups });
  const teachers = useQuery({ queryKey: ["teachers"], queryFn: listTeachers });
  const rooms = useQuery({ queryKey: ["rooms"], queryFn: listRooms });
  const teacherName = (id?: string) => teachers.data?.find((t) => t.id === id)?.fullName;
  const roomName = (id?: string) => rooms.data?.find((r) => r.id === id)?.name;

  const groups = (groupsQ.data ?? [])
    .filter((g) => !branchId || g.branchId === branchId)
    .filter((g) => parity === "all" || matchesParity(g.scheduleDays, parity));

  // Build the weekly grid: for each weekday, the groups that meet that day, sorted by start time.
  const byDay = useMemo(() => {
    return WEEKDAYS.map((w) => {
      const items = groups
        .filter((g) => parseDays(g.scheduleDays).includes(w.code))
        .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
      return { day: w, items };
    });
  }, [groups]);

  const today = todayCode();
  const hasAny = byDay.some((d) => d.items.length > 0);

  return (
    <div>
      <PageHeader
        title="Jadval"
        description="Haftalik dars jadvali — guruhlar vaqti va kunlaridan avtomatik"
        actions={
          <Link to="/attendance">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <CalendarCheck className="h-4 w-4 mr-2" />
              Davomat
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {PARITY_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setParity(t.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              parity === t.value
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {groupsQ.isLoading && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <LoadingBlock />
        </div>
      )}
      {groupsQ.isError && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <ErrorBlock message={extractApiError(groupsQ.error)} onRetry={() => groupsQ.refetch()} />
        </div>
      )}

      {!groupsQ.isLoading && !groupsQ.isError && !hasAny && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Jadval bo'sh. Guruhlarga dars kunlari va vaqtini qo'shsangiz, bu yerda avtomatik ko'rinadi.
        </div>
      )}

      {!groupsQ.isLoading && !groupsQ.isError && hasAny && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {byDay
            .filter((d) => d.items.length > 0)
            .map(({ day, items }) => (
              <div
                key={day.code}
                className={`rounded-xl border bg-white shadow-sm ${
                  day.code === today ? "border-indigo-300 ring-1 ring-indigo-100" : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                  <span className="text-sm font-semibold text-slate-800">{day.full}</span>
                  {day.code === today && (
                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
                      Bugun
                    </span>
                  )}
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map((g) => (
                    <SessionRow key={g.id} group={g} teacher={teacherName(g.teacherId)} room={roomName(g.roomId)} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function SessionRow({ group, teacher, room }: { group: Group; teacher?: string; room?: string }) {
  return (
    <Link
      to="/attendance"
      search={{ groupId: group.id }}
      className="block px-4 py-3 transition hover:bg-slate-50"
      title="Davomat qilish"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-900 truncate">{group.name}</span>
        {group.startTime && (
          <span className="inline-flex items-center gap-1 shrink-0 text-xs tabular-nums text-slate-500">
            <Clock className="h-3 w-3" />
            {group.startTime}
            {group.endTime ? `–${group.endTime}` : ""}
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
        {teacher && (
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" />
            {teacher}
          </span>
        )}
        {room && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {room}
          </span>
        )}
      </div>
    </Link>
  );
}
