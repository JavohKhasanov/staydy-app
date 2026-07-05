import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { extractApiError } from "@/lib/api";
import { listTeachers } from "@/lib/resources";
import { PageHeader } from "@/components/PageHeader";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { NewTeacherDialog } from "@/features/teachers/NewTeacherDialog";

export const Route = createFileRoute("/_authenticated/teachers/")({
  head: () => ({ meta: [{ title: "Ustozlar — Staydy" }] }),
  component: TeachersPage,
});

function TeachersPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["teachers"],
    queryFn: listTeachers,
  });
  const teachers = data ?? [];

  return (
    <div>
      <PageHeader
        title="Ustozlar"
        description="Ustozlar web-panelga kirib o'z guruhlarini boshqaradi"
        actions={<NewTeacherDialog />}
      />
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading && <LoadingBlock />}
        {isError && <ErrorBlock message={extractApiError(error)} onRetry={() => refetch()} />}
        {!isLoading && !isError && teachers.length === 0 && (
          <EmptyBlock title="Ustozlar topilmadi" description="Yangi ustoz qo'shing" />
        )}
        {!isLoading && !isError && teachers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Ism</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{t.fullName}</td>
                    <td className="px-4 py-3 text-slate-600">{t.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
