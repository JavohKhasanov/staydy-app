import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Banknote, CalendarX2, Hourglass, ShieldAlert } from "lucide-react";

import { authStore } from "@/lib/auth";
import {
  getPaymentAlerts,
  listMissingAttendance,
  listNotifications,
  markNotificationRead,
} from "@/lib/resources";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const money = (n: number) => n.toLocaleString("uz-UZ").replace(/,/g, " ") + " so'm";

// NotificationBell aggregates the center's live warnings (recomputed, no storage): today's
// sessions that have started but aren't fully marked, invoices past due, and students attending
// without an invoice (grace passed). Refreshes every 5 minutes.
export function NotificationBell() {
  // Missing-attendance is an admin concern (the endpoint is admin-gated); the finance role only
  // needs the payment alerts below.
  const isAdmin = authStore.getUser()?.role !== "finance";
  const missingQ = useQuery({
    queryKey: ["attendance-missing"],
    queryFn: listMissingAttendance,
    refetchInterval: 5 * 60_000,
    staleTime: 0,
    enabled: isAdmin,
  });
  const alertsQ = useQuery({
    queryKey: ["payment-alerts"],
    queryFn: getPaymentAlerts,
    refetchInterval: 5 * 60_000,
    staleTime: 0,
  });
  // Persistent in-app notifications (task assigned, SLA escalation, …).
  const navigate = useNavigate();
  const qc = useQueryClient();
  const notifsQ = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
    refetchInterval: 60_000,
    staleTime: 0,
  });
  const notifications = notifsQ.data ?? [];
  const unreadNotifs = notifications.filter((n) => !n.read);
  const openNotif = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const nowHM = new Date().toTimeString().slice(0, 5);
  // Show a group once its lesson has started (or all day if it has no time set) and keep it until
  // the backend stops returning it — i.e. until every member is marked.
  const missed = (missingQ.data ?? []).filter((g) => !g.startTime || g.startTime <= nowHM);
  const overdue = alertsQ.data?.overdueInvoices ?? [];
  const grace = alertsQ.data?.graceOverdue ?? [];
  const count = unreadNotifs.length + missed.length + overdue.length + grace.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Bildirishnomalar"
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuLabel>Bildirishnomalar</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {count === 0 && notifications.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-slate-500">
            Hammasi joyida — ogohlantirish yo'q.
          </div>
        )}

        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => {
              if (!n.read) openNotif.mutate(n.id);
              if (n.link) navigate({ to: n.link });
            }}
            className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50 ${
              n.read ? "opacity-60" : ""
            }`}
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
            <span className="min-w-0 text-sm">
              <span className="font-medium text-slate-900">{n.title}</span>
              {n.body && <span className="block text-xs text-slate-500">{n.body}</span>}
            </span>
            {!n.read && <span className="ml-auto mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
          </button>
        ))}

        {missed.map((g) => (
          <Link
            key={`m-${g.id}`}
            to="/attendance"
            search={{ groupId: g.id }}
            className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-slate-50"
          >
            <CalendarX2 className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span className="min-w-0 text-sm">
              <span className="font-medium text-slate-900">Davomat qilinmagan</span>
              <span className="block text-xs text-slate-500">
                {g.name}
                {g.startTime ? ` · ${g.startTime}${g.endTime ? `–${g.endTime}` : ""}` : ""}
              </span>
            </span>
          </Link>
        ))}

        {grace.map((g) => (
          <Link
            key={`g-${g.studentId}-${g.groupId}`}
            to="/groups/$id"
            params={{ id: g.groupId }}
            className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-slate-50"
          >
            <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span className="min-w-0 text-sm">
              <span className="font-medium text-slate-900">To'lov kutilmoqda</span>
              <span className="block text-xs text-slate-500">
                {g.studentName} · {g.groupName} · {g.attended} dars o'qidi, hisob yo'q
              </span>
            </span>
          </Link>
        ))}

        {overdue.map((o, i) => (
          <Link
            key={`o-${i}`}
            to="/students/$id"
            params={{ id: o.studentId }}
            className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-slate-50"
          >
            <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span className="min-w-0 text-sm">
              <span className="font-medium text-slate-900">Muddat o'tgan qarz</span>
              <span className="block text-xs text-slate-500">
                {o.studentName} · {money(o.balance)}
                {o.dueDate ? ` · muddat ${o.dueDate}` : ""}
              </span>
            </span>
          </Link>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
