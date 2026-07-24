import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { BranchProvider } from "@/features/branches/BranchContext";
import { useAutoRefresh } from "@/lib/useAutoRefresh";

// Path prefixes each limited role may visit. The director (center_admin) and platform owner have no
// entry here — they reach everything.
const FINANCE_PATHS = ["/finance", "/salaries", "/reports", "/students"];
// The administrator (manager) reaches everything except salaries and staff management.
const MANAGER_DENIED = ["/salaries", "/staff"];

function currentRole(): string | undefined {
  try {
    return (JSON.parse(localStorage.getItem("ss_user") || "{}") as { role?: string }).role;
  } catch {
    return undefined;
  }
}

const allowed = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(p + "/"));

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("ss_access_token");
    if (!token) {
      throw redirect({ to: "/login" });
    }
    // Role-scoped panels: teachers live under /me, finance under its finance pages. Anything else
    // bounces to that role's home. Administrators/super_admin pass through.
    const role = currentRole();
    const path = location.pathname;
    if (role === "teacher" && !path.startsWith("/me")) {
      throw redirect({ to: "/me/students" });
    }
    if (role === "finance" && !allowed(path, FINANCE_PATHS)) {
      throw redirect({ to: "/finance" });
    }
    if (role === "manager" && allowed(path, MANAGER_DENIED)) {
      throw redirect({ to: "/" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  useAutoRefresh();
  return (
    <BranchProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </BranchProvider>
  );
}