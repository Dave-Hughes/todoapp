"use client";

import {
  CalendarDays,
  CalendarRange,
  Calendar,
  Settings,
} from "lucide-react";

interface BottomTabsProps {
  activePath: string;
}

const tabs = [
  { path: "/today", label: "Today", icon: CalendarDays },
  { path: "/week", label: "Week", icon: CalendarRange },
  { path: "/month", label: "Month", icon: Calendar },
  { path: "/settings", label: "Settings", icon: Settings },
] as const;

export function BottomTabs({ activePath }: BottomTabsProps) {
  return (
    <nav
      className="
        lg:hidden fixed bottom-0 inset-x-0
        bg-[var(--color-surface)] border-t border-[var(--color-border-subtle)]
        z-[var(--z-sticky)]
        pb-[env(safe-area-inset-bottom)]
      "
      aria-label="Main navigation"
    >
      <ul className="flex items-stretch" role="list">
        {tabs.map(({ path, label, icon: Icon }) => {
          const isActive = activePath === path;
          return (
            <li key={path} className="flex-1">
              <a
                href={path}
                aria-current={isActive ? "page" : undefined}
                className={`
                  flex flex-col items-center justify-center gap-[var(--space-1)]
                  py-[var(--space-2)] pt-[var(--space-3)]
                  min-h-[var(--touch-target-min)]
                  text-[length:var(--text-xs)] font-[var(--weight-medium)]
                  transition-colors duration-[var(--duration-instant)]
                  ${
                    isActive
                      ? "text-[color:var(--color-accent)]"
                      : "text-[color:var(--color-text-tertiary)] active:text-[color:var(--color-text-primary)]"
                  }
                `}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.25 : 1.75}
                  aria-hidden="true"
                />
                <span>{label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
