import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { extractApiError } from "@/lib/api";
import { listMyStudents } from "@/lib/resources";
import { PageHeader } from "@/components/PageHeader";
import { RiskBadge, normalizeRisk } from "@/components/RiskBadge";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/StateBlocks";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/me/students/")({
  head: () => ({ meta: [{ title: "Mening talabalarim — Staydy" }] }),
  component: MyStudentsPage,
});

// Teacher-scoped students list: reads /me/students (ownership-checked, highest risk first) and
// links into the shared student detail page, where marking is routed through /me/*.
function MyStudentsPage() {
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState("all");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["me", "students"],
    queryFn: listMyStudents,
  });

  const students = data ?? [];
  const filtered = students.filter((s) => {
    if (search && !s.fullName?.toLowerCase().includes(search.toLowerCase())) return false;
    if (risk !== "all" && normalizeRisk(s.riskLevel) !== risk) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Mening talabalarim"
        description="Sizning guruhlaringizdagi talabalar — eng yuqori xavfdan boshlab"
      />

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Ism bo'yicha qidirish..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={risk} onValueChange={setRisk}>
            <SelectTrigger>
              <SelectValue placeholder="Xavf darajasi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha xavflar</SelectItem>
              <SelectItem value="red">Qizil</SelectItem>
              <SelectItem value="yellow">Sariq</SelectItem>
              <SelectItem value="green">Yashil</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading && <LoadingBlock />}
        {isError && <ErrorBlock message={extractApiError(error)} onRetry={() => refetch()} />}
        {!isLoading && !isError && filtered.length === 0 && (
          <EmptyBlock title="Talabalar topilmadi" />
        )}
        {!isLoading && !isError && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Ism</th>
                  <th className="px-4 py-3 font-medium">Guruh</th>
                  <th className="px-4 py-3 font-medium text-right">Xavf</th>
                  <th className="px-4 py-3 font-medium">Daraja</th>
                  <th className="px-4 py-3 font-medium">Telefon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 cursor-pointer">
                    <td className="px-4 py-3">
                      <Link
                        to="/students/$id"
                        params={{ id: s.id }}
                        className="font-medium text-slate-900 hover:text-indigo-600"
                      >
                        {s.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.group ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {s.riskScore != null ? s.riskScore.toFixed(0) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <RiskBadge level={s.riskLevel} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.phone ?? "—"}</td>
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
