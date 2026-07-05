import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { listLeads, listStudents } from "@/lib/resources";
import { Input } from "@/components/ui/input";

// GlobalSearch is the header search: filters students + leads by name/phone and jumps to them.
// Rendered only for center staff (teachers have their own scoped list).
export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  const term = q.trim().toLowerCase();
  const active = term.length >= 1;

  const students = useQuery({ queryKey: ["students"], queryFn: listStudents, enabled: active });
  const leads = useQuery({ queryKey: ["leads"], queryFn: listLeads, enabled: active });

  const matchS = active
    ? (students.data ?? [])
        .filter((s) => s.fullName?.toLowerCase().includes(term) || s.phone?.includes(term))
        .slice(0, 6)
    : [];
  const matchL = active
    ? (leads.data ?? [])
        .filter((l) => l.name.toLowerCase().includes(term) || (l.phone ?? "").includes(term))
        .slice(0, 4)
    : [];
  const open = focused && active;
  const empty = matchS.length + matchL.length === 0;

  const go = (to: "/students/$id" | "/leads/$id", id: string) => {
    setQ("");
    setFocused(false);
    navigate({ to, params: { id } });
  };

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Talaba yoki lid qidirish..."
        className="pl-9 bg-slate-50 border-slate-200"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {empty && <div className="px-3 py-3 text-sm text-slate-500">Topilmadi</div>}
          {matchS.length > 0 && (
            <div className="px-3 pt-2 pb-1 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Talabalar
            </div>
          )}
          {matchS.map((s) => (
            <button
              key={s.id}
              onMouseDown={() => go("/students/$id", s.id)}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex items-center justify-between"
            >
              <span className="text-slate-800">{s.fullName}</span>
              {s.phone && <span className="text-slate-400 text-xs">{s.phone}</span>}
            </button>
          ))}
          {matchL.length > 0 && (
            <div className="px-3 pt-2 pb-1 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Lidlar
            </div>
          )}
          {matchL.map((l) => (
            <button
              key={l.id}
              onMouseDown={() => go("/leads/$id", l.id)}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex items-center justify-between"
            >
              <span className="text-slate-800">{l.name}</span>
              {l.phone && <span className="text-slate-400 text-xs">{l.phone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
