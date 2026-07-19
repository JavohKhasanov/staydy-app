import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { listGroups, listGroupStudents } from "@/lib/resources";
import { PageHeader } from "@/components/PageHeader";
import { AttendanceJournal } from "@/features/attendance/AttendanceJournal";

export const Route = createFileRoute("/_authenticated/attendance/")({
  head: () => ({ meta: [{ title: "Davomat — Staydy" }] }),
  // groupId comes from "Davomat qilish" on a group's page to preselect that group.
  validateSearch: (s: Record<string, unknown>): { groupId?: string } =>
    typeof s.groupId === "string" && s.groupId ? { groupId: s.groupId } : {},
  component: AttendancePage,
});

function AttendancePage() {
  const { groupId } = Route.useSearch();
  const groupsQ = useQuery({ queryKey: ["groups"], queryFn: listGroups });

  return (
    <div>
      <PageHeader title="Davomat" description="Guruh va sanani tanlab, butun ro'yxatni belgilang" />
      <AttendanceJournal
        groups={groupsQ.data ?? []}
        groupsLoading={groupsQ.isLoading}
        loadStudents={(g) => listGroupStudents(g.id)}
        initialGroupId={groupId}
      />
    </div>
  );
}
