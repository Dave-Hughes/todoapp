import Link from "next/link";
import { ArrowRight, BookOpen, ListChecks, Palette, LayoutGrid } from "lucide-react";
import { WikiShell } from "@/components/wiki-shell/wiki-shell";
import { listDocs } from "@/lib/wiki/docs";
import { getBuildProgress } from "@/lib/wiki/progress";
import { listComponentDocs } from "@/lib/wiki/design-system";
import { getOpenQuestions } from "@/lib/wiki/open-questions";

/**
 * /wiki — overview
 * ================
 * The landing page for the wiki. Glance-level dashboard: where the build is,
 * what docs exist, how many components are in the design system, and what's
 * unresolved on the roadmap. Everything links to the detailed surface.
 */

export const dynamic = "force-dynamic"; // always reflect current file state

export default async function WikiOverviewPage() {
  const [docs, progress, { components, missingDocs }, openQ] = await Promise.all([
    listDocs(),
    getBuildProgress(),
    listComponentDocs(),
    getOpenQuestions(),
  ]);

  const percent =
    progress.totalItems === 0
      ? 0
      : Math.round((progress.doneItems / progress.totalItems) * 100);

  const inProgressPhase = progress.phases.find((p) => p.status === "in-progress");
  const nextUpcoming = progress.phases.find((p) => p.status === "upcoming");

  return (
    <WikiShell
      activeSection="overview"
      eyebrow="Internal"
      title="Project wiki"
      subtitle="Where the build is, what the docs say, and what we haven't decided yet. Internal-facing for now; the foundation of user-facing docs later."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--space-6)]">
        {/* --- Progress card (spans 2 cols on desktop) --- */}
        <section
          className="
            lg:col-span-2
            rounded-[var(--radius-xl)]
            border border-[var(--color-border-subtle)]
            bg-[var(--color-surface)]
            p-[var(--space-6)]
            shadow-[var(--shadow-sm)]
          "
          aria-label="Build progress"
        >
          <div className="flex items-baseline justify-between gap-[var(--space-4)]">
            <p
              className="
                text-[length:var(--text-xs)]
                font-[var(--weight-semibold)]
                uppercase tracking-[0.18em]
                text-[color:var(--color-text-tertiary)]
              "
            >
              Where we are
            </p>
            <Link
              href="/wiki/progress"
              className="
                text-[length:var(--text-sm)]
                font-[var(--weight-semibold)]
                text-[color:var(--color-accent)]
                hover:text-[color:var(--color-accent-hover)]
                inline-flex items-center gap-[var(--space-1)]
              "
            >
              Full phase view <ArrowRight size={14} strokeWidth={2.25} />
            </Link>
          </div>

          <p
            className="
              mt-[var(--space-2)]
              font-[family-name:var(--font-display)]
              text-[length:var(--text-2xl)]
              font-[var(--weight-bold)]
              text-[color:var(--color-text-primary)]
              leading-[var(--leading-tight)]
            "
          >
            {percent}% shipped
          </p>

          <div
            className="
              mt-[var(--space-3)]
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
              className="h-full rounded-[var(--radius-full)] bg-[var(--color-accent)]"
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="mt-[var(--space-6)] grid grid-cols-1 sm:grid-cols-2 gap-[var(--space-4)]">
            <StatusHighlight
              label={inProgressPhase ? "In progress" : "Next up"}
              phaseNum={(inProgressPhase ?? nextUpcoming)?.number}
              title={(inProgressPhase ?? nextUpcoming)?.title ?? "All phases shipped"}
              tone={inProgressPhase ? "accent" : "muted"}
            />
            <div className="flex flex-col gap-[var(--space-2)] text-[length:var(--text-sm)]">
              <Stat label="Shipped" value={progress.counts.done} />
              <Stat label="In progress" value={progress.counts["in-progress"]} />
              <Stat label="Upcoming" value={progress.counts.upcoming} />
            </div>
          </div>
        </section>

        {/* --- Roadmap card --- */}
        <section
          className="
            rounded-[var(--radius-xl)]
            border border-[var(--color-border-subtle)]
            bg-[var(--color-surface)]
            p-[var(--space-6)]
            shadow-[var(--shadow-sm)]
            flex flex-col
          "
          aria-label="Roadmap snapshot"
        >
          <div className="flex items-baseline justify-between gap-[var(--space-4)]">
            <p
              className="
                text-[length:var(--text-xs)]
                font-[var(--weight-semibold)]
                uppercase tracking-[0.18em]
                text-[color:var(--color-text-tertiary)]
              "
            >
              Open questions
            </p>
            <Link
              href="/wiki/roadmap"
              className="
                text-[length:var(--text-sm)]
                font-[var(--weight-semibold)]
                text-[color:var(--color-accent)]
                hover:text-[color:var(--color-accent-hover)]
                inline-flex items-center gap-[var(--space-1)]
              "
            >
              Roadmap <ArrowRight size={14} strokeWidth={2.25} />
            </Link>
          </div>

          <p
            className="
              mt-[var(--space-2)]
              font-[family-name:var(--font-display)]
              text-[length:var(--text-2xl)]
              font-[var(--weight-bold)]
              text-[color:var(--color-text-primary)]
              leading-[var(--leading-tight)]
            "
          >
            {openQ.byStatus.open} open
          </p>
          <p
            className="
              mt-[var(--space-1)]
              text-[length:var(--text-sm)]
              text-[color:var(--color-text-tertiary)]
            "
          >
            {openQ.byStatus.resolved} resolved of {openQ.byStatus.total} total
          </p>

          <div className="mt-[var(--space-4)] flex flex-col gap-[var(--space-2)]">
            {openQ.questions
              .filter((q) => !q.resolved)
              .slice(0, 4)
              .map((q) => (
                <div
                  key={q.number}
                  className="
                    flex items-start gap-[var(--space-2)]
                    text-[length:var(--text-sm)]
                    text-[color:var(--color-text-secondary)]
                    leading-[var(--leading-normal)]
                  "
                >
                  <span
                    className="
                      tabular-nums
                      font-[var(--weight-semibold)]
                      text-[color:var(--color-accent)]
                      shrink-0
                    "
                  >
                    {q.number}.
                  </span>
                  <span className="truncate">{q.title}</span>
                </div>
              ))}
          </div>
        </section>
      </div>

      {/* --- Section tiles --- */}
      <div
        className="
          mt-[var(--space-8)]
          grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
          gap-[var(--space-4)]
        "
      >
        <SectionTile
          href="/wiki/progress"
          icon={ListChecks}
          title="Build progress"
          count={progress.totalItems}
          countLabel={`${progress.doneItems} shipped`}
          description="Every phase and sub-item, parsed live from CLAUDE.md."
        />
        <SectionTile
          href="/wiki/docs"
          icon={BookOpen}
          title="Docs"
          count={docs.length}
          countLabel="markdown files"
          description="Vision, personas, scope, principles, tech stack — browsable."
        />
        <SectionTile
          href="/wiki/design-system"
          icon={Palette}
          title="Design system"
          count={components.length}
          countLabel="components documented"
          description="The component library — each with its co-located .md doc."
          footnote={
            missingDocs.length > 0
              ? `${missingDocs.length} component${missingDocs.length === 1 ? "" : "s"} missing a doc`
              : undefined
          }
        />
        <SectionTile
          href="/wiki/roadmap"
          icon={LayoutGrid}
          title="Roadmap"
          count={openQ.byStatus.open}
          countLabel="open questions"
          description="What we haven't decided, what we parked, and what ships after v1."
          className="sm:col-span-2 lg:col-span-1"
        />
      </div>
    </WikiShell>
  );
}

/* ================================================================
 * Building blocks (local to this page)
 * ================================================================ */

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-[var(--space-3)]">
      <span className="text-[color:var(--color-text-tertiary)]">{label}</span>
      <span className="tabular-nums font-[var(--weight-semibold)] text-[color:var(--color-text-primary)]">
        {value}
      </span>
    </div>
  );
}

function StatusHighlight({
  label,
  phaseNum,
  title,
  tone,
}: {
  label: string;
  phaseNum: number | undefined;
  title: string;
  tone: "accent" | "muted";
}) {
  return (
    <div
      className={`
        rounded-[var(--radius-lg)]
        p-[var(--space-4)]
        ${
          tone === "accent"
            ? "bg-[var(--color-accent-subtle)]"
            : "bg-[var(--color-surface-dim)]"
        }
      `}
    >
      <p
        className={`
          text-[length:var(--text-xs)]
          font-[var(--weight-semibold)]
          uppercase tracking-[0.12em]
          ${
            tone === "accent"
              ? "text-[color:var(--color-accent)]"
              : "text-[color:var(--color-text-tertiary)]"
          }
        `}
      >
        {label}{phaseNum != null ? ` · Phase ${phaseNum}` : ""}
      </p>
      <p
        className="
          mt-[var(--space-1)]
          text-[length:var(--text-sm)]
          font-[var(--weight-semibold)]
          text-[color:var(--color-text-primary)]
          leading-[var(--leading-normal)]
        "
      >
        {title}
      </p>
    </div>
  );
}

function SectionTile({
  href,
  icon: Icon,
  title,
  count,
  countLabel,
  description,
  footnote,
  className = "",
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>;
  title: string;
  count: number;
  countLabel: string;
  description: string;
  footnote?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`
        group
        rounded-[var(--radius-xl)]
        border border-[var(--color-border-subtle)]
        bg-[var(--color-surface)]
        p-[var(--space-6)]
        flex flex-col gap-[var(--space-3)]
        transition-all duration-[var(--duration-fast)]
        hover:border-[var(--color-accent)] hover:shadow-[var(--shadow-md)]
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <span
          className="
            flex items-center justify-center
            w-[var(--space-8)] h-[var(--space-8)]
            rounded-[var(--radius-md)]
            bg-[var(--color-accent-subtle)]
            text-[color:var(--color-accent)]
          "
          aria-hidden="true"
        >
          <Icon size={20} strokeWidth={2} />
        </span>
        <ArrowRight
          size={18}
          strokeWidth={2.25}
          aria-hidden="true"
          className="text-[color:var(--color-text-tertiary)] group-hover:text-[color:var(--color-accent)] transition-colors duration-[var(--duration-fast)]"
        />
      </div>
      <div>
        <h3
          className="
            font-[family-name:var(--font-display)]
            text-[length:var(--text-lg)]
            font-[var(--weight-semibold)]
            text-[color:var(--color-text-primary)]
          "
        >
          {title}
        </h3>
        <p
          className="
            mt-[var(--space-0-5)]
            text-[length:var(--text-sm)]
            text-[color:var(--color-text-tertiary)]
          "
        >
          <span className="tabular-nums font-[var(--weight-semibold)] text-[color:var(--color-text-primary)]">{count}</span>{" "}
          {countLabel}
        </p>
      </div>
      <p
        className="
          text-[length:var(--text-sm)]
          text-[color:var(--color-text-secondary)]
          leading-[var(--leading-relaxed)]
        "
      >
        {description}
      </p>
      {footnote && (
        <p
          className="
            mt-auto pt-[var(--space-2)]
            text-[length:var(--text-xs)]
            text-[color:var(--color-warning)]
            font-[var(--weight-medium)]
          "
        >
          {footnote}
        </p>
      )}
    </Link>
  );
}
