import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, CalendarDays } from "lucide-react";

import { extractApiError } from "@/lib/api";
import { recordAttendance, getSessionTopic, saveSessionTopic } from "@/lib/resources";
import type { Group, Student } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const todayISO = () => new Date().toISOString().slice(0, 10);

// Per-student status. late/excused count as attended server-side (is_present derived), so they
// don't lower the risk-facing attendance rate.
const OPTS = [
  { v: "PRESENT", label: "Keldi", on: "bg-emerald-600 text-white" },
  { v: "LATE", label: "Kechikdi", on: "bg-amber-500 text-white" },
  { v: "EXCUSED", label: "Sababli", on: "bg-sky-500 text-white" },
  { v: "ABSENT", label: "Kelmadi", on: "bg-rose-600 text-white" },
];

// AttendanceJournal is the group + date attendance sheet: pick a group and a day, mark the whole
// roster in one screen, save once. Used by both the admin page and the teacher's /me page — they
// differ only in how groups/students are loaded (all groups vs the teacher's own).
export function AttendanceJournal({
  groups,
  groupsLoading,
  loadStudents,
  initialGroupId,
}: {
  groups: Group[];
  groupsLoading: boolean;
  loadStudents: (group: Group) => Promise<Student[]>;
  initialGroupId?: string;
}) {
  const queryClient = useQueryClient();
  const [groupId, setGroupId] = useState<string>(initialGroupId ?? "");
  const [date, setDate] = useState<string>(todayISO());
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [topic, setTopic] = useState<string>("");

  const group = useMemo(() => groups.find((g) => g.id === groupId) ?? null, [groups, groupId]);

  const studentsQ = useQuery({
    queryKey: ["attendance-journal", groupId],
    queryFn: () => loadStudents(group!),
    enabled: !!group,
  });
  const students = studentsQ.data ?? [];

  // Prefill the topic already recorded for this group + date.
  const topicQ = useQuery({
    queryKey: ["session-topic", groupId, date],
    queryFn: () => getSessionTopic(groupId, date),
    enabled: !!group,
  });
  useEffect(() => {
    setTopic(topicQ.data ?? "");
  }, [topicQ.data]);

  // Default everyone to absent — the teacher marks who actually came.
  useEffect(() => {
    if (studentsQ.data) {
      setMarks(Object.fromEntries(studentsQ.data.map((s) => [s.id, "ABSENT"])));
      setChecked(new Set());
    }
  }, [studentsQ.data]);

  const setAll = (v: string) =>
    setMarks(Object.fromEntries(students.map((s) => [s.id, v])));
  const toggleCheck = (id: string) =>
    setChecked((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allChecked = students.length > 0 && checked.size === students.length;
  const toggleAll = () =>
    setChecked(allChecked ? new Set() : new Set(students.map((s) => s.id)));
  // Apply a status to every checked student, then clear the selection.
  const setChecked_ = (v: string) => {
    setMarks((m) => {
      const n = { ...m };
      checked.forEach((id) => (n[id] = v));
      return n;
    });
    setChecked(new Set());
  };
  const presentCount = students.filter((s) => (marks[s.id] ?? "ABSENT") !== "ABSENT").length;

  const save = useMutation({
    mutationFn: async () => {
      await Promise.all(
        students.map((s) =>
          recordAttendance(s.id, { date, status: marks[s.id] ?? "ABSENT" }),
        ),
      );
      if (topic.trim()) await saveSessionTopic(groupId, date, topic.trim());
    },
    onSuccess: () => {
      toast.success("Davomat saqlandi");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["session-topic", groupId, date] });
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  return (
    <div className="space-y-5">
      {/* Guruh + sana tanlash */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Guruh</label>
          <Select value={groupId} onValueChange={setGroupId} disabled={groupsLoading}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={groupsLoading ? "Yuklanmoqda..." : "Guruhni tanlang"} />
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:w-52">
          <label className="mb-1 block text-xs font-medium text-slate-500">Sana</label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Ro'yxat */}
      {!group ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Davomat qilish uchun guruhni tanlang.
        </div>
      ) : studentsQ.isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-10 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : studentsQ.isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {extractApiError(studentsQ.error)}
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Bu guruhda talaba yo'q.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Bugun nima o'tildi? (mavzu) <span className="text-rose-500">*</span>
            </label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Masalan: Present Perfect, 5-mavzu"
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <span className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                title="Hammasini tanlash"
              />
              {presentCount}/{students.length} keldi
            </span>
            {checked.size > 0 ? (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="mr-1 text-slate-500">Tanlangan {checked.size} ta:</span>
                {OPTS.map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setChecked_(o.v)}
                    className={`rounded-md px-2 py-1 font-medium ${o.on}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 text-xs">
                <button onClick={() => setAll("PRESENT")} className="font-medium text-emerald-700 hover:underline">
                  Hammasi keldi
                </button>
                <button onClick={() => setAll("ABSENT")} className="font-medium text-rose-600 hover:underline">
                  Hammasi kelmadi
                </button>
              </div>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {students.map((s) => {
              const cur = marks[s.id] ?? "ABSENT";
              return (
                <div key={s.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex items-center gap-2.5 text-sm font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={checked.has(s.id)}
                      onChange={() => toggleCheck(s.id)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                    {s.fullName}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {OPTS.map((o) => (
                      <button
                        key={o.v}
                        onClick={() => setMarks((m) => ({ ...m, [s.id]: o.v }))}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                          cur === o.v ? o.on : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end border-t border-slate-100 px-4 py-3">
            <Button
              onClick={() => save.mutate()}
              disabled={save.isPending || !topic.trim()}
              title={!topic.trim() ? "Avval mavzuni kiriting" : undefined}
            >
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Davomatni saqlash
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
