import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  UserMinus,
  UserPlus,
  BookMarked,
  CalendarCheck,
  CalendarDays,
  Clock,
  MapPin,
  Pencil,
  User,
  Users,
} from "lucide-react";

import { extractApiError } from "@/lib/api";
import { getGroup, listCourses, listGroupStudents, listRooms, listTeachers, removeGroupMember } from "@/lib/resources";
import { daysLabel } from "@/lib/weekdays";
import { RiskBadge } from "@/components/RiskBadge";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { Button } from "@/components/ui/button";
import { GroupDialog } from "@/features/groups/GroupDialog";
import { GroupPayments } from "@/features/groups/GroupPayments";
import { AddStudentDialog } from "@/features/groups/AddStudentDialog";

export const Route = createFileRoute("/_authenticated/groups/$id")({
  head: () => ({ meta: [{ title: "Guruh — Staydy" }] }),
  component: GroupDetailPage,
});

function GroupDetailPage() {
  const { id } = Route.useParams();
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const qc = useQueryClient();
  const removeM = useMutation({
    mutationFn: (studentId: string) => removeGroupMember(id, studentId),
    onSuccess: () => {
      toast.success("Talaba guruhdan chiqarildi");
      qc.invalidateQueries({ queryKey: ["group-students"] });
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["group-finance"] });
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  });

  const groupQ = useQuery({ queryKey: ["group", id], queryFn: () => getGroup(id) });
  const studentsQ = useQuery({
    queryKey: ["group-students", id],
    queryFn: () => listGroupStudents(id),
  });
  const teachers = useQuery({ queryKey: ["teachers"], queryFn: listTeachers });
  const courses = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const rooms = useQuery({ queryKey: ["rooms"], queryFn: listRooms });

  const g = groupQ.data;
  const teacherName = g?.teacherId ? teachers.data?.find((t) => t.id === g.teacherId)?.fullName : undefined;
  const course = g?.courseId ? courses.data?.find((c) => c.id === g.courseId) : undefined;
  const courseName = course?.name;
  const roomName = g?.roomId ? rooms.data?.find((r) => r.id === g.roomId)?.name : undefined;
  const students = studentsQ.data ?? [];

  return (
    <div>
      <Link
        to="/groups"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Guruhlar
      </Link>

      {groupQ.isLoading && <LoadingBlock />}
      {groupQ.isError && (
        <ErrorBlock message={extractApiError(groupQ.error)} onRetry={() => groupQ.refetch()} />
      )}

      {g && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{g.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-600">
                {teacherName && (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-4 w-4 text-slate-400" /> {teacherName}
                  </span>
                )}
                {courseName && (
                  <Link to="/courses" className="inline-flex items-center gap-1.5 hover:text-indigo-600">
                    <BookMarked className="h-4 w-4 text-slate-400" /> {courseName}
                  </Link>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-slate-400" /> {daysLabel(g.scheduleDays)}
                </span>
                {g.startTime && (
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {g.startTime}
                    {g.endTime ? `–${g.endTime}` : ""}
                  </span>
                )}
                {roomName && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-slate-400" /> {roomName}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-1.5" />
                Tahrirlash
              </Button>
              <Link to="/attendance" search={{ groupId: g.id }}>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                  <CalendarCheck className="h-4 w-4 mr-1.5" />
                  Davomat qilish
                </Button>
              </Link>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Users className="h-4 w-4 text-slate-400" />
                Talabalar
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {students.length}
                  {g.capacity ? `/${g.capacity}` : ""}
                </span>
              </span>
              <Button size="sm" variant="outline" className="h-8" onClick={() => setAddOpen(true)}>
                <UserPlus className="h-4 w-4 mr-1.5" />
                Talaba qo'shish
              </Button>
            </div>
            {studentsQ.isLoading && <LoadingBlock />}
            {studentsQ.isError && (
              <ErrorBlock message={extractApiError(studentsQ.error)} onRetry={() => studentsQ.refetch()} />
            )}
            {!studentsQ.isLoading && !studentsQ.isError && students.length === 0 && (
              <EmptyBlock
                title="Talaba yo'q"
                description="Talabalar sahifasida talabani shu guruhga biriktiring"
              />
            )}
            {students.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Ism</th>
                      <th className="px-4 py-3 font-medium text-right">Xavf</th>
                      <th className="px-4 py-3 font-medium">Daraja</th>
                      <th className="px-4 py-3 font-medium">Telefon</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link
                            to="/students/$id"
                            params={{ id: s.id }}
                            className="font-medium text-slate-900 hover:text-indigo-600"
                          >
                            {s.fullName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                          {s.riskScore != null ? s.riskScore.toFixed(0) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <RiskBadge level={s.riskLevel} />
                        </td>
                        <td className="px-4 py-3 text-slate-600">{s.phone ?? "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            title="Guruhdan chiqarish"
                            disabled={removeM.isPending}
                            onClick={() => {
                              if (window.confirm(`${s.fullName} shu guruhdan chiqarilsinmi?`))
                                removeM.mutate(s.id);
                            }}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <GroupPayments groupId={g.id} coursePrice={course?.price} />
        </div>
      )}

      {editOpen && g && <GroupDialog open onOpenChange={(o) => !o && setEditOpen(false)} group={g} />}
      {addOpen && g && (
        <AddStudentDialog groupId={g.id} groupName={g.name} branchId={g.branchId} onClose={() => setAddOpen(false)} />
      )}
    </div>
  );
}
