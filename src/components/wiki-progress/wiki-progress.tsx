"use client";

import { Check, Clock, Circle } from "lucide-react";
import type { Phase, PhaseStatus, ProgressSummary } from "@/lib/wiki/progress";

/**
 * WikiProgress
 * ============
 * Renders the parsed CLAUDE.md build progress as a phase tracker. Compact
 * summary up top, then each phase as a row with status pill and any
 * sub-items underneath. All status color/icons come from tokens.
 */

interface WikiProgressProps {
  summary: ProgressSummary;
  /** If true, hide phases that are neither "done" nor "in-progress". */
  activeOnly?: boolean;
}

export function WikiProgress({ summary, activeOnly = false }: WikiProgressProps) {
  const { phases, counts, totalItems, doneItems } = summary;
  const visiblePhases = activeOnly
    ? phases.filter((p) => p.status !== "upcoming")
    : phases;

  const percent = totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100);

  return (
    <div className="flex flex-col gap-[var(--space-8)]">
      {/* Summary card */}
      <section
        aria-label="Progress summary"
        className="
          rounded-[var(--radius-xl)]
          border border-[var(--color-border-subtle)]
          bg-[var(--color-surface)]
          p-[var(--space-6)]
          shadow-[var(--shadow-sm)]
        "
      >
        <div className="flex items-baseline justify-between gap-[var(--space-4)] mb-[var(--space-4)]">
          <h2
            className="
              font-[family-name:var(--font-display)]
              text-[length:var(--text-lg)]
              font-[var(--weight-semibold)]
              text-[color:var(--color-text-primary)]
            "
          >
            {percent}% of the way there
          </h2>
          <span
            className="
              tabular-nums
              text-[length:var(--text-sm)]
              text-[color:var(--color-text-tertiary)]
            "
          >
            {doneItems} / {totalItems} items
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="
            h-[var(--space-2)]
            rounded-[var(--radius-full)]
            bg-[var(--color-surface-dim)]
            overflow-hidden
          "
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-[var(--radius-full)] bg-[var(--color-accent)] transition-[width] duration-[var(--duration-normal)]"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div
          className="
            mt-[var(--space-4)] flex flex-wrap gap-[var(--space-2)]
            text-[length:var(--text-sm)]
          "
        >
          <StatChip status="done" count={counts.done} label="done" />
          <StatChip status="in-progress" count={counts["in-progress"]} label="in progress" />
          <StatChip status="upcoming" count={counts.upcoming} label="upcoming" />
        </div>
      </section>

      {/* Phases list */}
      <ol role="list" className="flex flex-col gap-[var(--space-3)]">
        {visiblePhases.map((phase) => (
          <li key={phase.number}>
            <PhaseRow phase={phase} />
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ================================================================
 * Building blocks
 * ================================================================ */

function PhaseRow({ phase }: { phase: Phase }) {
  return (
    <article
      className={`
        rounded-[var(--radius-lg)]
        border
        p-[var(--space-4)] lg:p-[var(--space-6)]
        transition-colors duration-[var(--duration-fast)]
        ${
          phase.status === "in-progress"
            ? "border-[var(--color-accent)] bg-[var(--color-accent-subtle)]"
            : "border-[var(--color-border-subtle)] bg-[var(--color-surface)]"
        }
      `}
    >
      <header className="flex items-start gap-[var(--space-3)]">
        <StatusIcon status={phase.status} large />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-1)]">
            <span
              className="
                tabular-nums
                text-[length:var(--text-xs)]
                font-[var(--weight-semibold)]
                uppercase tracking-[0.12em]
                text-[color:var(--color-text-tertiary)]
              "
            >
              Phase {phase.number}
            </span>
            <span className="text-[color:var(--color-text-tertiary)]">·</span>
            <StatusLabel status={phase.status} />
          </div>
          <h3
            className="
              font-[family-name:var(--font-display)]
              text-[length:var(--text-lg)]
              font-[var(--weight-semibold)]
              text-[color:var(--color-text-primary)]
              leading-[var(--leading-tight)]
            "
          >
            {phase.title}
          </h3>
        </div>
      </header>

      {(phase.subItems.length > 0 || phase.notes.length > 0) && (
        <div className="mt-[var(--space-4)] ml-[var(--space-8)] flex flex-col gap-[var(--space-2)]">
          {phase.subItems.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-[var(--space-2)]"
            >
              <StatusIcon status={item.status} />
              <span
                className={`
                  text-[length:var(--text-sm)]
                  leading-[var(--leading-normal)]
                  ${
                    item.status === "done"
                      ? "text-[color:var(--color-text-secondary)]"
                      : "text-[color:var(--color-text-primary)]"
                  }
                `}
              >
                {item.title}
              </span>
            </div>
          ))}
          {phase.notes.map((note, idx) => (
            <p
              key={`note-${idx}`}
              className="
                text-[length:var(--text-sm)]
                text-[color:var(--color-text-tertiary)]
                leading-[var(--leading-relaxed)]
                pl-[var(--space-6)]
                italic
              "
            >
              {note}
            </p>
          ))}
        </div>
      )}
    </article>
  );
}

function StatChip({
  status,
  count,
  label,
}: {
  status: PhaseStatus;
  count: number;
  label: string;
}) {
  const styles = statusStyles(status);
  return (
    <span
      className={`
        inline-flex items-center gap-[var(--space-1-5)]
        px-[var(--space-3)] py-[var(--space-1)]
        rounded-[var(--radius-full)]
        ${styles.bg} ${styles.text}
        font-[var(--weight-medium)]
      `}
    >
      <span className="tabular-nums font-[var(--weight-semibold)]">{count}</span>
      {label}
    </span>
  );
}

function StatusLabel({ status }: { status: PhaseStatus }) {
  const text =
    status === "done" ? "Shipped" : status === "in-progress" ? "In progress" : "Upcoming";
  const styles = statusStyles(status);
  return (
    <span
      className={`
        text-[length:var(--text-xs)]
        font-[var(--weight-semibold)]
        uppercase tracking-[0.12em]
        ${styles.text}
      `}
    >
      {text}
    </span>
  );
}

function StatusIcon({
  status,
  large = false,
}: {
  status: PhaseStatus;
  large?: boolean;
}) {
  const size = large ? 22 : 16;
  const base = large
    ? "shrink-0 mt-[var(--space-0-5)]"
    : "shrink-0 mt-[var(--space-0-5)]";
  if (status === "done") {
    return (
      <span
        aria-label="Shipped"
        className={`${base} inline-flex items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-success)] text-[color:var(--color-accent-text)]`}
        style={{ width: size + 4, height: size + 4 }}
      >
        <Check size={size - 4} strokeWidth={3} aria-hidden="true" />
      </span>
    );
  }
  if (status === "in-progress") {
    return (
      <span
        aria-label="In progress"
        className={`${base} inline-flex items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-accent)] text-[color:var(--color-accent-text)]`}
        style={{ width: size + 4, height: size + 4 }}
      >
        <Clock size={size - 4} strokeWidth={2.5} aria-hidden="true" />
      </span>
    );
  }
  return (
    <span
      aria-label="Upcoming"
      className={`${base} inline-flex items-center justify-center text-[color:var(--color-text-tertiary)]`}
      style={{ width: size + 4, height: size + 4 }}
    >
      <Circle size={size - 4} strokeWidth={2} aria-hidden="true" />
    </span>
  );
}

function statusStyles(status: PhaseStatus) {
  if (status === "done") {
    return {
      bg: "bg-[var(--color-success-subtle)]",
      text: "text-[color:var(--color-success)]",
    };
  }
  if (status === "in-progress") {
    return {
      bg: "bg-[var(--color-accent-subtle)]",
      text: "text-[color:var(--color-accent)]",
    };
  }
  return {
    bg: "bg-[var(--color-surface-dim)]",
    text: "text-[color:var(--color-text-tertiary)]",
  };
}
