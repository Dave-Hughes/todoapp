import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { WikiShell } from "@/components/wiki-shell/wiki-shell";
import { getOpenQuestions } from "@/lib/wiki/open-questions";

/**
 * /wiki/roadmap
 * =============
 * Board view of open-questions.md — every question grouped by section, with
 * resolved vs open status visible at a glance. Links out to the source doc
 * for the full reasoning.
 */

export const dynamic = "force-dynamic";

export default async function WikiRoadmapPage() {
  const { bySection, byStatus } = await getOpenQuestions();

  return (
    <WikiShell
      activeSection="roadmap"
      eyebrow="Roadmap"
      title="Open questions"
      subtitle="What's resolved, what's still open, and where each one lives. This is the at-a-glance board; the reasoning is in the source doc."
      headerAction={
        <Link
          href="/wiki/docs/open-questions"
          className="
            inline-flex items-center gap-[var(--space-2)]
            h-[var(--touch-target-min)] px-[var(--space-4)]
            rounded-[var(--radius-md)]
            text-[length:var(--text-sm)] font-[var(--weight-semibold)]
            bg-[var(--color-accent)] text-[color:var(--color-accent-text)]
            hover:bg-[var(--color-accent-hover)]
            shadow-[var(--shadow-accent-glow)]
            transition-all duration-[var(--duration-fast)]
          "
        >
          Open the source doc →
        </Link>
      }
    >
      {/* Summary row */}
      <div
        className="
          mb-[var(--space-8)]
          grid grid-cols-3 gap-[var(--space-3)]
        "
      >
        <SummaryChip
          label="Open"
          value={byStatus.open}
          tone="accent"
        />
        <SummaryChip
          label="Resolved"
          value={byStatus.resolved}
          tone="success"
        />
        <SummaryChip
          label="Total"
          value={byStatus.total}
          tone="muted"
        />
      </div>

      <div className="flex flex-col gap-[var(--space-10)]">
        {bySection.map((group) => (
          <section key={group.section} aria-labelledby={`sec-${slugify(group.section)}`}>
            <h2
              id={`sec-${slugify(group.section)}`}
              className="
                font-[family-name:var(--font-display)]
                text-[length:var(--text-lg)]
                font-[var(--weight-semibold)]
                text-[color:var(--color-text-primary)]
                mb-[var(--space-4)]
              "
            >
              {group.section}
            </h2>
            <ul role="list" className="flex flex-col gap-[var(--space-2)]">
              {group.questions.map((q) => (
                <li
                  key={q.number}
                  className={`
                    flex items-start gap-[var(--space-3)]
                    rounded-[var(--radius-lg)]
                    border
                    p-[var(--space-4)]
                    ${
                      q.resolved
                        ? "border-[var(--color-border-subtle)] bg-[var(--color-surface)]"
                        : "border-[var(--color-accent)] bg-[var(--color-accent-subtle)]"
                    }
                  `}
                >
                  {q.resolved ? (
                    <CheckCircle2
                      size={20}
                      strokeWidth={2}
                      aria-label="Resolved"
                      className="shrink-0 mt-[var(--space-0-5)] text-[color:var(--color-success)]"
                    />
                  ) : (
                    <Circle
                      size={20}
                      strokeWidth={2}
                      aria-label="Open"
                      className="shrink-0 mt-[var(--space-0-5)] text-[color:var(--color-accent)]"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-[var(--space-2)] mb-[var(--space-1)]">
                      <span
                        className="
                          tabular-nums
                          text-[length:var(--text-xs)]
                          font-[var(--weight-semibold)]
                          uppercase tracking-[0.12em]
                          text-[color:var(--color-text-tertiary)]
                        "
                      >
                        Question {q.number}
                      </span>
                      {q.resolved && (
                        <span
                          className="
                            text-[length:var(--text-xs)]
                            font-[var(--weight-semibold)]
                            uppercase tracking-[0.12em]
                            text-[color:var(--color-success)]
                          "
                        >
                          Resolved
                        </span>
                      )}
                    </div>
                    <p
                      className={`
                        text-[length:var(--text-base)]
                        leading-[var(--leading-normal)]
                        ${
                          q.resolved
                            ? "text-[color:var(--color-text-secondary)]"
                            : "text-[color:var(--color-text-primary)] font-[var(--weight-medium)]"
                        }
                      `}
                    >
                      {q.title}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </WikiShell>
  );
}

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "accent" | "success" | "muted";
}) {
  const palette =
    tone === "accent"
      ? { bg: "bg-[var(--color-accent-subtle)]", text: "text-[color:var(--color-accent)]" }
      : tone === "success"
        ? { bg: "bg-[var(--color-success-subtle)]", text: "text-[color:var(--color-success)]" }
        : { bg: "bg-[var(--color-surface-dim)]", text: "text-[color:var(--color-text-tertiary)]" };

  return (
    <div
      className={`
        rounded-[var(--radius-lg)]
        ${palette.bg}
        p-[var(--space-4)]
        flex flex-col gap-[var(--space-1)]
      `}
    >
      <span
        className={`
          text-[length:var(--text-xs)]
          font-[var(--weight-semibold)]
          uppercase tracking-[0.12em]
          ${palette.text}
        `}
      >
        {label}
      </span>
      <span
        className="
          font-[family-name:var(--font-display)]
          text-[length:var(--text-2xl)]
          font-[var(--weight-bold)]
          tabular-nums
          text-[color:var(--color-text-primary)]
          leading-none
        "
      >
        {value}
      </span>
    </div>
  );
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
