import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { BranchProvider } from "@/features/branches/BranchContext";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("ss_access_token");
    if (!token) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <BranchProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </BranchProvider>
  );
}