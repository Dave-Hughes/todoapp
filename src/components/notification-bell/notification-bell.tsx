"use client";

import { useRef, useState, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Popover } from "../popover/popover";
import { BottomSheet } from "../bottom-sheet/bottom-sheet";
import { NotificationList } from "../notification-list/notification-list";
import { useNotifications, useMarkAllNotificationsRead } from "@/lib/hooks/use-notifications";
import { useTasks } from "@/lib/hooks/use-tasks";
import { scrollToTaskAndHighlight } from "@/lib/ui/scroll-to-task";
import type { Notification } from "@/db/schema";

interface Member {
  id: string;
  displayName: string;
}

interface NotificationBellProps {
  /** Household members for resolving actor names in notification copy. */
  members: Member[];
}

/** Cap badge display at 9+ to avoid wide badges. */
function badgeLabel(count: number): string {
  return count > 9 ? "9+" : String(count);
}

const MOBILE_QUERY = "(max-width: 767px)";

function subscribeToMobileChange(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getIsMobileSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getIsMobileServerSnapshot(): boolean {
  return false; // SSR default: desktop view
}

export function NotificationBell({ members }: NotificationBellProps) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Subscribe to matchMedia changes without triggering cascading renders.
  const isMobile = useSyncExternalStore(
    subscribeToMobileChange,
    getIsMobileSnapshot,
    getIsMobileServerSnapshot,
  );

  const { data: notifications = [] } = useNotifications();
  const { data: dbTasks = [] } = useTasks();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter((n) => n.readAt === null).length;

  // Build taskId → title lookup from the TanStack cache.
  const taskTitles: Record<string, string> = {};
  for (const t of dbTasks) {
    taskTitles[t.id] = t.title;
  }

  const open = useCallback(() => {
    setIsOpen(true);
    // Fire mark-all only when there are unread notifications.
    if (unreadCount > 0) {
      markAllRead.mutate();
    }
  }, [unreadCount, markAllRead]);

  const close = useCallback(() => setIsOpen(false), []);

  const handleRowClick = useCallback(
    (n: Notification) => {
      close();
      if (n.taskId) {
        // Navigate to Today, then scroll-highlight after a short delay to give
        // the page time to mount the task list.
        router.push("/today");
        setTimeout(() => scrollToTaskAndHighlight(n.taskId!), 400);
      }
    },
    [close, router],
  );

  const ariaLabel =
    unreadCount === 0
      ? "Notifications"
      : `Notifications — ${unreadCount} unread`;

  const bellButton = (
    <button
      ref={buttonRef}
      type="button"
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      onClick={open}
      className="
        relative flex items-center justify-center
        rounded-[var(--radius-md)]
        text-[color:var(--color-text-secondary)]
        hover:text-[color:var(--color-text-primary)]
        hover:bg-[var(--color-surface-dim)]
        transition-colors duration-[var(--duration-instant)]
        min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)]
        focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]
        outline-none
      "
    >
      <Bell size={20} strokeWidth={2} aria-hidden="true" />

      {/* Unread badge */}
      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className="
            absolute -top-0.5 -right-0.5
            flex items-center justify-center
            h-4 min-w-[1rem] px-[var(--space-1)]
            rounded-[var(--radius-full)]
            bg-[var(--color-accent)]
            text-[color:var(--color-accent-text)]
            text-[length:var(--text-xs)]
            font-[var(--weight-semibold)]
            leading-none
            tabular-nums
          "
        >
          {badgeLabel(unreadCount)}
        </span>
      )}
    </button>
  );

  const panel = (
    <NotificationList
      notifications={notifications}
      members={members}
      taskTitles={taskTitles}
      onRowClick={handleRowClick}
    />
  );

  return (
    <>
      {bellButton}

      {/* Desktop: Popover anchored to the bell button */}
      {!isMobile && (
        <Popover
          isOpen={isOpen}
          onClose={close}
          anchorRef={buttonRef}
          placement="bottom-end"
          role="dialog"
          ariaLabel="Notifications"
          className="w-80"
        >
          <div className="py-[var(--space-2)]">
            <div className="flex items-center justify-between px-[var(--space-4)] pb-[var(--space-2)]">
              <h2 className="font-[family-name:var(--font-display)] text-[length:var(--text-base)] font-[var(--weight-semibold)] text-[color:var(--color-text-primary)]">
                Notifications
              </h2>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {panel}
            </div>
          </div>
        </Popover>
      )}

      {/* Mobile: BottomSheet */}
      {isMobile && (
        <BottomSheet
          isOpen={isOpen}
          onClose={close}
          title="Notifications"
          heightMode="auto"
        >
          {panel}
        </BottomSheet>
      )}
    </>
  );
}
