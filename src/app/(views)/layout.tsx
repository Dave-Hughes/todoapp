"use client";

/**
 * Shared layout for the task views (/today, /week, /month later).
 *
 * Hoisting AppShell here — rather than having each page wrap itself — keeps
 * the sidebar, mobile header, and bottom tabs mounted across navigation.
 * Only `{children}` swaps when the route changes, which is what lets the
 * view-switch animation in AppShell feel like an actual transition instead
 * of a full page reload. Without this, the sidebar would unmount/remount on
 * every nav (flash from collapsed → pinned, points hero re-running, etc.).
 *
 * Why a client component:
 *   - usePathname() for activePath highlighting
 *   - TanStack Query hooks (useMe, useTasks) for chrome stats
 *
 * Why these stats live here not in the pages:
 *   - Sidebar needs "N left" and "N ahead" regardless of which view is open
 *   - Keeping the derivation in one place prevents the two pages from
 *     disagreeing about the numbers
 */

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { useMe } from "@/lib/hooks/use-me";
import { useTasks } from "@/lib/hooks/use-tasks";
import { todayIso, addDaysIso } from "@/lib/task-adapters";

export default function ViewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/today";
  const { data: meData } = useMe();
  const { data: dbTasks = [] } = useTasks();

  const me = meData?.me ?? null;
  const partner = meData?.partner ?? null;
  const mePoints = meData?.mePoints ?? { lifetime: 0, today: 0 };
  const partnerPoints = meData?.partnerPoints ?? null;

  const today = useMemo(() => todayIso(), []);

  // "N left" for /today — non-completed hard-deadline due today or overdue,
  // plus flexible tasks that have carried forward from past days.
  const todayCount = useMemo(() => {
    if (!me) return undefined;
    return dbTasks.filter((t) => {
      if (t.completedAt) return false;
      if (t.flexible) return t.dueDate <= today;
      return t.dueDate <= today;
    }).length;
  }, [dbTasks, me, today]);

  // "N ahead" for /week — active hard-deadline tasks in the calendar week
  // containing today (Sunday-anchored). Mirrors the Week page's own logic.
  const weekCount = useMemo(() => {
    if (!me) return undefined;
    const [y, m, d] = today.split("-").map(Number);
    const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
    const dow = dt.getUTCDay();
    const weekStart = addDaysIso(today, -dow);
    const weekEnd = addDaysIso(weekStart, 6);
    return dbTasks.filter(
      (t) =>
        !t.completedAt &&
        !t.flexible &&
        t.dueDate >= weekStart &&
        t.dueDate <= weekEnd,
    ).length;
  }, [dbTasks, me, today]);

  // "N this month" for /month — active hard-deadline tasks in the current month.
  const monthCount = useMemo(() => {
    if (!me) return undefined;
    const [y, m] = today.split("-").map(Number);
    const monthStart = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const monthEnd = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return dbTasks.filter(
      (t) =>
        !t.completedAt &&
        !t.flexible &&
        t.dueDate >= monthStart &&
        t.dueDate <= monthEnd,
    ).length;
  }, [dbTasks, me, today]);

  // Month label for sidebar stat — shows count when available, else month name.
  const monthLabel = useMemo(() => {
    if (monthCount != null && monthCount > 0) return `${monthCount} this mo`;
    return new Date().toLocaleDateString("en-US", { month: "long" });
  }, [monthCount]);

  return (
    <AppShell
      activePath={pathname}
      userId={me?.id}
      userName={me?.displayName ?? ""}
      partnerId={partner?.id}
      partnerName={partner?.displayName ?? ""}
      userPoints={mePoints.lifetime}
      partnerPoints={partnerPoints?.lifetime}
      userPointsToday={mePoints.today}
      partnerPointsToday={partnerPoints?.today ?? 0}
      hasNotification={false}
      todayCount={todayCount}
      weekCount={weekCount}
      monthLabel={monthLabel}
    >
      {children}
    </AppShell>
  );
}
