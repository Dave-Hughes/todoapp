"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  BookOpen,
  LayoutGrid,
  ListChecks,
  Palette,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/**
 * WikiShell
 * =========
 * Inner chrome for every /wiki page. Sits inside AppShell's content area and
 * supplies the wiki's own secondary navigation + page header. Kept
 * deliberately quiet — the wiki is an internal read-surface, not a marketing
 * site; its chrome shouldn't out-shout what it frames.
 */

export type WikiSection =
  | "overview"
  | "progress"
  | "docs"
  | "design-system"
  | "roadmap";

type NavDef = {
  section: WikiSection;
  label: string;
  href: string;
  icon: LucideIcon;
};

const NAV: readonly NavDef[] = [
  { section: "overview", label: "Overview", href: "/wiki", icon: Sparkles },
  { section: "progress", label: "Progress", href: "/wiki/progress", icon: ListChecks },
  { section: "docs", label: "Docs", href: "/wiki/docs", icon: BookOpen },
  { section: "design-system", label: "Design system", href: "/wiki/design-system", icon: Palette },
  { section: "roadmap", label: "Roadmap", href: "/wiki/roadmap", icon: LayoutGrid },
];

interface WikiShellProps {
  activeSection: WikiSection;
  title: string;
  subtitle?: string;
  /** Small caption shown above the title — e.g. a category label. */
  eyebrow?: string;
  /** Optional slot for a right-aligned action at the header right (edge link, etc.). */
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export function WikiShell({
  activeSection,
  title,
  subtitle,
  eyebrow,
  headerAction,
  children,
}: WikiShellProps) {
  const nav = useMemo(() => NAV, []);

  return (
    <div className="max-w-[72rem] mx-auto">
      {/* ---- Secondary nav: pill row ---- */}
      <nav
        aria-label="Wiki sections"
        className="
          -mx-[var(--space-4)] lg:mx-0
          px-[var(--space-4)] lg:px-0
          overflow-x-auto scrollbar-hide
          mb-[var(--space-6)]
        "
      >
        <ul
          role="list"
          className="
            flex items-center gap-[var(--space-1)]
            w-max
            p-[var(--space-1)]
            rounded-[var(--radius-full)]
            bg-[var(--color-surface)]
            border border-[var(--color-border-subtle)]
            shadow-[var(--shadow-sm)]
          "
        >
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive = item.section === activeSection;
            return (
              <li key={item.section}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`
                    inline-flex items-center gap-[var(--space-2)]
                    h-[var(--touch-target-min)]
                    px-[var(--space-4)]
                    rounded-[var(--radius-full)]
                    text-[length:var(--text-sm)]
                    font-[var(--weight-semibold)]
                    whitespace-nowrap
                    transition-colors duration-[var(--duration-fast)]
                    ${
                      isActive
                        ? "bg-[var(--color-accent)] text-[color:var(--color-accent-text)] shadow-[var(--shadow-accent-glow)]"
                        : "text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)] hover:bg-[var(--color-surface-dim)]"
                    }
                  `}
                >
                  <Icon size={16} strokeWidth={2.25} aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ---- Page header ---- */}
      <header className="mb-[var(--space-8)] flex items-start justify-between gap-[var(--space-4)]">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p
              className="
                text-[length:var(--text-xs)]
                font-[var(--weight-semibold)]
                uppercase tracking-[0.18em]
                text-[color:var(--color-text-tertiary)]
                mb-[var(--space-2)]
              "
            >
              {eyebrow}
            </p>
          )}
          <h1
            className="
              font-[family-name:var(--font-display)]
              text-[length:var(--text-2xl)]
              lg:text-[length:var(--text-3xl)]
              font-[var(--weight-bold)]
              text-[color:var(--color-text-primary)]
              leading-[var(--leading-tight)]
              tracking-tight
            "
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="
                mt-[var(--space-2)]
                text-[length:var(--text-base)]
                text-[color:var(--color-text-secondary)]
                leading-[var(--leading-relaxed)]
                max-w-[48rem]
              "
            >
              {subtitle}
            </p>
          )}
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </header>

      {/* ---- Page content ---- */}
      <div>{children}</div>
    </div>
  );
}
