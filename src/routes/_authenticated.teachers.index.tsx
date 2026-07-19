import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { extractApiError } from "@/lib/api";
import { listTeachers } from "@/lib/resources";
import { PageHeader } from "@/components/PageHeader";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { NewTeacherDialog } from "@/features/teachers/NewTeacherDialog";
import { TeacherActions } from "@/features/teachers/TeacherActions";
import { Pagination, paginate } from "@/components/Pagination";

export const Route = createFileRoute("/_authenticated/teachers/")({
  head: () => ({ meta: [{ title: "Ustozlar — Staydy" }] }),
  component: TeachersPage,
});

function TeachersPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["teachers"],
    queryFn: listTeachers,
  });
  const teachersAll = data ?? [];
  const [page, setPage] = useState(1);
  const { rows: teachers, page: safePage, pages } = paginate(teachersAll, page);

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
        {!isLoading && !isError && teachersAll.length === 0 && (
          <EmptyBlock title="Ustozlar topilmadi" description="Yangi ustoz qo'shing" />
        )}
        {!isLoading && !isError && teachersAll.length > 0 && (
          <div className="overflow-x-auto max-h-[62vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Ism</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{t.fullName}</td>
                    <td className="px-4 py-3 text-slate-600">{t.email}</td>
                    <td className="px-4 py-3">
                      <TeacherActions teacher={t} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={safePage} pages={pages} total={teachersAll.length} onPage={setPage} />
      </div>
    </div>
  );
}
