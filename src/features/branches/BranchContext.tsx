import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { listBranches } from "@/lib/resources";

const KEY = "staydy_branch";

type Ctx = { branchId: string; setBranchId: (id: string) => void };
const BranchContext = createContext<Ctx>({ branchId: "", setBranchId: () => {} });

// useBranch returns the currently selected branch filter ("" = all branches).
export const useBranch = () => useContext(BranchContext);

export function BranchProvider({ children }: { children: ReactNode }) {
  const [branchId, setBranchIdState] = useState(() =>
    typeof window === "undefined" ? "" : localStorage.getItem(KEY) ?? "",
  );
  const setBranchId = (id: string) => {
    setBranchIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(KEY, id);
  };
  return (
    <BranchContext.Provider value={{ branchId, setBranchId }}>{children}</BranchContext.Provider>
  );
}

// BranchSelector is the header dropdown. Renders nothing when the center has no branches
// (single-location centers don't need it).
export function BranchSelector() {
  const { branchId, setBranchId } = useBranch();
  const branches = useQuery({ queryKey: ["branches"], queryFn: listBranches });
  const list = branches.data ?? [];
  // localStorage survives logout, so a branch picked in ANOTHER center leaks into this one and
  // silently filters every list to empty. Reset when the stored id isn't in this org's branches.
  useEffect(() => {
    if (branches.data && branchId && !branches.data.some((b) => b.id === branchId)) {
      setBranchId("");
    }
  }, [branches.data, branchId]);
  if (list.length === 0) return null;
  return (
    <select
      value={branchId}
      onChange={(e) => setBranchId(e.target.value)}
      className="h-9 rounded-md border border-slate-200 bg-slate-50 px-2 text-sm text-slate-700 max-w-40"
      title="Filial"
    >
      <option value="">Barcha filiallar</option>
      {list.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );
}
