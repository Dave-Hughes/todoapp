"use client";

import { UserPlus, CheckCircle2, HandMetal } from "lucide-react";
import type { Notification } from "@/db/schema";

interface Member { id: string; displayName: string; }

interface Props {
  notifications: Notification[];
  members: Member[];        // household members, for resolving actor names
  taskTitles: Record<string, string>; // taskId -> title map, for inline bolding
  onRowClick?: (n: Notification) => void;
}

function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 172800) return "yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function copyFor(n: Notification, actorName: string, taskTitle: string | undefined): React.ReactNode {
  switch (n.type) {
    case "task_assigned":
      return (<>{actorName} put <b>{taskTitle ?? "a task"}</b> on your plate.</>);
    case "task_completed_by_partner":
      return (<>{actorName} got it. <b>{taskTitle ?? "Task done"}.</b></>);
    case "partner_joined":
      return (<>{actorName}&apos;s in. You two are in business.</>);
  }
}

function iconFor(type: Notification["type"]) {
  switch (type) {
    case "task_assigned": return HandMetal;
    case "task_completed_by_partner": return CheckCircle2;
    case "partner_joined": return UserPlus;
  }
}

export function NotificationList({ notifications, members, taskTitles, onRowClick }: Props) {
  if (notifications.length === 0) {
    return (
      <div className="py-[var(--space-6)] px-[var(--space-4)] text-center text-[color:var(--color-text-tertiary)] text-[length:var(--text-sm)]">
        Nothing yet.
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
      {notifications.map((n) => {
        const Icon = iconFor(n.type);
        const actor = members.find((m) => m.id === n.actorUserId)?.displayName ?? "They";
        const title = n.taskId ? taskTitles[n.taskId] : undefined;
        const isUnread = n.readAt === null;
        return (
          <li
            key={n.id}
            className={`flex gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-3)] ${
              isUnread ? "bg-[var(--color-accent-subtle)]" : ""
            } ${onRowClick ? "cursor-pointer hover:bg-[var(--color-surface-dim)]" : ""}`}
            onClick={() => onRowClick?.(n)}
          >
            <div className="mt-0.5 flex h-5 w-5 items-center justify-center text-[color:var(--color-accent)]">
              {isUnread ? (
                <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" aria-label="unread" />
              ) : (
                <Icon size={16} strokeWidth={2} aria-hidden />
              )}
            </div>
            <div className="flex-1">
              <div className="text-[length:var(--text-sm)] text-[color:var(--color-text-primary)] leading-[var(--leading-snug)]">
                {copyFor(n, actor, title)}
              </div>
              <div className="text-[length:var(--text-xs)] text-[color:var(--color-text-tertiary)] mt-[var(--space-1)]">
                {relativeTime(n.createdAt)}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
