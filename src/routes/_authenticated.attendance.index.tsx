import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { listGroups, listGroupStudents } from "@/lib/resources";
import { PageHeader } from "@/components/PageHeader";
import { AttendanceJournal } from "@/features/attendance/AttendanceJournal";

export const Route = createFileRoute("/_authenticated/attendance/")({
  head: () => ({ meta: [{ title: "Davomat — Staydy" }] }),
  component: AttendancePage,
});

function AttendancePage() {
  const groupsQ = useQuery({ queryKey: ["groups"], queryFn: listGroups });

  return (
    <div>
      <PageHeader title="Davomat" description="Guruh va sanani tanlab, butun ro'yxatni belgilang" />
      <AttendanceJournal
        groups={groupsQ.data ?? []}
        groupsLoading={groupsQ.isLoading}
        loadStudents={(g) => listGroupStudents(g.id)}
      />
    </div>
  );
}
