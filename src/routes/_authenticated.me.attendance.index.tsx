import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { listMyGroups, listMyStudents } from "@/lib/resources";
import { PageHeader } from "@/components/PageHeader";
import { AttendanceJournal } from "@/features/attendance/AttendanceJournal";

export const Route = createFileRoute("/_authenticated/me/attendance/")({
  head: () => ({ meta: [{ title: "Davomat — Staydy" }] }),
  component: MyAttendancePage,
});

// Teacher attendance: their own groups only. The per-group students endpoint is center_admin-gated
// (403s for teachers), so the roster is derived from /me/students filtered by group — same trick as
// /me/groups. recordAttendance routes to the ownership-checked /me path for teachers.
function MyAttendancePage() {
  const groupsQ = useQuery({ queryKey: ["me", "groups"], queryFn: listMyGroups });

  return (
    <div>
      <PageHeader title="Davomat" description="Guruh va sanani tanlab, davomat qiling" />
      <AttendanceJournal
        groups={groupsQ.data ?? []}
        groupsLoading={groupsQ.isLoading}
        loadStudents={async (g) => {
          const all = await listMyStudents();
          return all.filter((s) => s.groupId === g.id || s.group === g.name);
        }}
      />
    </div>
  );
}
