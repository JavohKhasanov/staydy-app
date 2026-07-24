import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  BookMarked,
  BookOpen,
  CalendarDays,
  CalendarCheck,
  GraduationCap,
  ClipboardList,
  Wallet,
  Coins,
  BarChart3,
  TrendingUp,
  UserCog,
  Plug,
  Settings,
  Menu,
  LogOut,
  Globe,
  ChevronLeft,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { authStore } from "@/lib/auth";
import { INTEGRATIONS_ENABLED } from "@/lib/flags";
import { useSession } from "@/features/auth/useSession";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "@/components/GlobalSearch";
import { NotificationBell } from "@/components/NotificationBell";
import { BranchSelector } from "@/features/branches/BranchContext";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const NAV: NavItem[] = [
  { to: "/", label: "Boshqaruv paneli", icon: LayoutDashboard, exact: true },
  // Lidlar hidden until amoCRM integration (see lib/flags.ts) — re-add here when it ships.
  { to: "/students", label: "Talabalar", icon: Users },
  { to: "/courses", label: "Kurslar", icon: BookMarked },
  { to: "/groups", label: "Guruhlar", icon: BookOpen },
  { to: "/schedule", label: "Jadval", icon: CalendarDays },
  { to: "/attendance", label: "Davomat", icon: CalendarCheck },
  { to: "/teachers", label: "Ustozlar", icon: GraduationCap },
  { to: "/staff", label: "Xodimlar", icon: UserCog },
  { to: "/tasks", label: "Vazifalar", icon: ClipboardList },
  { to: "/retention", label: "Ushlab qolish", icon: TrendingUp },
  { to: "/finance", label: "Moliya", icon: Wallet },
  { to: "/salaries", label: "Maosh", icon: Coins },
  { to: "/reports", label: "Hisobotlar", icon: BarChart3 },
  // Integratsiya gated by INTEGRATIONS_ENABLED (filtered below).
  ...(INTEGRATIONS_ENABLED ? [{ to: "/integration", label: "Integratsiya", icon: Plug }] : []),
  { to: "/settings", label: "Sozlamalar", icon: Settings },
];

// Teachers see only their own groups/students (everything else is center_admin-gated server-side).
const TEACHER_NAV: NavItem[] = [
  { to: "/me/students", label: "Mening talabalarim", icon: Users },
  { to: "/me/groups", label: "Mening guruhlarim", icon: BookOpen },
  { to: "/me/attendance", label: "Davomat", icon: CalendarCheck },
];

// Finance (moliya) sees only the money surfaces.
const FINANCE_NAV: NavItem[] = [
  { to: "/finance", label: "Moliya", icon: Wallet },
  { to: "/salaries", label: "Maosh", icon: Coins },
  { to: "/reports", label: "Hisobotlar", icon: BarChart3 },
  { to: "/retention", label: "Ushlab qolish", icon: TrendingUp },
];

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super admin",
  center_admin: "Direktor",
  manager: "Administrator",
  finance: "Moliya",
  teacher: "O'qituvchi",
};

function navFor(role?: string): NavItem[] {
  if (role === "teacher") return TEACHER_NAV;
  if (role === "finance") return FINANCE_NAV;
  // Administrator (manager): full operational nav minus salaries and staff management.
  if (role === "manager") return NAV.filter((n) => n.to !== "/salaries" && n.to !== "/staff");
  return NAV; // direktor (center_admin) / super_admin
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, organization } = useSession();
  const nav = navFor(user?.role);
  const navigate = useNavigate();

  const handleLogout = () => {
    authStore.clear();
    navigate({ to: "/login", replace: true });
  };

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="h-screen overflow-hidden flex bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-slate-200 bg-white transition-all duration-200",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <img src="/staydy.png" alt="" className="h-9 w-9 object-contain" />
              <span className="font-semibold text-slate-900 tracking-tight">Staydy</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-md p-1.5 hover:bg-slate-100 text-slate-500"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft
              className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
            />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/40" />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white border-r border-slate-200 flex flex-col">
            <div className="h-16 flex items-center gap-2 px-4 border-b border-slate-200 font-semibold">
              <img src="/staydy.png" alt="" className="h-9 w-9 object-contain" />
              Staydy
            </div>
            <nav className="flex-1 p-2 space-y-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to, item.exact);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                      active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center gap-3 px-4 md:px-6">
          <button
            className="md:hidden rounded-md p-1.5 hover:bg-slate-100"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden md:flex font-semibold text-slate-900">Staydy</div>
          <div className="flex-1 max-w-md mx-auto md:mx-6">
            {user?.role !== "teacher" && <GlobalSearch />}
          </div>
          {user?.role !== "teacher" && <NotificationBell />}
          {user?.role !== "teacher" && user?.role !== "finance" && <BranchSelector />}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 border border-slate-200 rounded-md px-2 py-1">
            <Globe className="h-3.5 w-3.5" />
            uz
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2 hover:bg-slate-100">
                <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
                  {(user?.fullName ?? "U").slice(0, 1).toUpperCase()}
                </div>
                <div className="hidden md:flex flex-col items-start leading-tight">
                  <span className="text-sm font-medium">{user?.fullName ?? "Foydalanuvchi"}</span>
                  <span className="text-xs text-slate-500">{organization?.name ?? ""}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user?.fullName ?? "Foydalanuvchi"}</span>
                  <span className="text-xs text-slate-500 font-normal">
                    {[ROLE_LABEL[user?.role ?? ""], organization?.name].filter(Boolean).join(" · ")}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-rose-600">
                <LogOut className="h-4 w-4 mr-2" />
                Chiqish
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
