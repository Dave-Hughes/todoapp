"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "../sidebar/sidebar";
import { BottomTabs } from "../bottom-tabs/bottom-tabs";
import { MobileHeader } from "../mobile-header/mobile-header";

const PIN_STORAGE_KEY = "todoapp:sidebar-pinned";

interface AppShellProps {
  children: React.ReactNode;
  activePath: string;
  userName: string;
  partnerName?: string;
  userPoints: number;
  partnerPoints?: number;
  userPointsToday?: number;
  partnerPointsToday?: number;
  hasNotification?: boolean;
  todayCount?: number;
  weekCount?: number;
  monthLabel?: string;
}

export function AppShell({
  children,
  activePath,
  userName,
  partnerName,
  userPoints,
  partnerPoints,
  userPointsToday = 0,
  partnerPointsToday = 0,
  hasNotification = false,
  todayCount,
  weekCount,
  monthLabel,
}: AppShellProps) {
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PIN_STORAGE_KEY);
      if (raw === "1") setIsPinned(true);
    } catch {
      /* noop */
    }
  }, []);

  const togglePin = useCallback(() => {
    setIsPinned((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(PIN_STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  // Keyboard shortcut — ⌘\ / Ctrl+\ toggles pin. Ignored when typing in inputs.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key !== "\\") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      togglePin();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePin]);

  return (
    <div
      className="min-h-screen"
      style={{
        // Content offset follows pin state. Hover-expansion floats over content
        // (no margin shift) so the user can peek without reflow.
        ["--app-content-offset" as string]: isPinned
          ? "var(--sidebar-width)"
          : "var(--sidebar-width-peek)",
      }}
    >
      {/* Skip-to-content link */}
      <a
        href="#main-content"
        className="
          sr-only focus:not-sr-only
          fixed top-[var(--space-2)] left-[var(--space-2)] z-[var(--z-tooltip)]
          px-[var(--space-4)] py-[var(--space-2)]
          bg-[var(--color-accent)] text-[color:var(--color-accent-text)]
          rounded-[var(--radius-md)] text-[length:var(--text-sm)] font-[var(--weight-semibold)]
          shadow-[var(--shadow-md)]
        "
      >
        Skip to content
      </a>

      <Sidebar
        activePath={activePath}
        userName={userName}
        partnerName={partnerName}
        userPoints={userPoints}
        partnerPoints={partnerPoints}
        userPointsToday={userPointsToday}
        partnerPointsToday={partnerPointsToday}
        hasNotification={hasNotification}
        todayCount={todayCount}
        weekCount={weekCount}
        monthLabel={monthLabel}
        isPinned={isPinned}
        onTogglePin={togglePin}
      />

      <MobileHeader
        userName={userName}
        partnerName={partnerName}
        userPoints={userPoints}
        partnerPoints={partnerPoints}
        userPointsToday={userPointsToday}
        partnerPointsToday={partnerPointsToday}
        hasNotification={hasNotification}
      />

      <main
        id="main-content"
        className="
          pt-0
          pb-[var(--tab-bar-height)] lg:pb-0
          lg:ml-[var(--app-content-offset)]
          transition-[margin] duration-[var(--duration-normal)]
        "
      >
        <div className="px-[var(--space-4)] lg:px-[var(--space-8)] py-[var(--space-4)] lg:py-[var(--space-8)]">
          {children}
        </div>
      </main>

      <BottomTabs activePath={activePath} />
    </div>
  );
}
