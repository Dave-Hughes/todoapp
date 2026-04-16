import Link from "next/link";
import { AlertTriangle, ArrowRight, Box } from "lucide-react";
import { WikiShell } from "@/components/wiki-shell/wiki-shell";
import { listComponentDocs } from "@/lib/wiki/design-system";

/**
 * /wiki/design-system
 * ===================
 * Index of every component in src/components/* that ships with a .md doc.
 * Surfaces drift (components missing a doc) explicitly — per the design
 * system's rule that undocumented components are incomplete.
 */

export const dynamic = "force-dynamic";

export default async function WikiDesignSystemPage() {
  const { components, missingDocs } = await listComponentDocs();

  return (
    <WikiShell
      activeSection="design-system"
      eyebrow="Library"
      title="Design system"
      subtitle="Every component that ships with its co-located .md doc. Code is the source of truth; this is how we read it."
    >
      {missingDocs.length > 0 && (
        <div
          role="status"
          className="
            mb-[var(--space-6)]
            flex items-start gap-[var(--space-3)]
            rounded-[var(--radius-lg)]
            border border-[var(--color-warning)]
            bg-[var(--color-warning-subtle)]
            p-[var(--space-4)]
          "
        >
          <AlertTriangle
            size={18}
            strokeWidth={2}
            aria-hidden="true"
            className="mt-[var(--space-0-5)] shrink-0 text-[color:var(--color-warning)]"
          />
          <div className="min-w-0 flex-1">
            <p
              className="
                font-[var(--weight-semibold)]
                text-[color:var(--color-text-primary)]
              "
            >
              {missingDocs.length} component{missingDocs.length === 1 ? "" : "s"} missing a doc
            </p>
            <p
              className="
                mt-[var(--space-1)]
                text-[length:var(--text-sm)]
                text-[color:var(--color-text-secondary)]
                leading-[var(--leading-relaxed)]
              "
            >
              Drift between a component and its doc is a bug. Add a sibling{" "}
              <code className="font-[family-name:var(--font-mono)] px-[var(--space-1)] py-[var(--space-0-5)] rounded-[var(--radius-sm)] bg-[var(--color-surface-dim)]">
                .md
              </code>{" "}
              in the same commit that adds the{" "}
              <code className="font-[family-name:var(--font-mono)] px-[var(--space-1)] py-[var(--space-0-5)] rounded-[var(--radius-sm)] bg-[var(--color-surface-dim)]">
                .tsx
              </code>
              .
            </p>
            <ul
              className="
                mt-[var(--space-3)] flex flex-wrap gap-[var(--space-2)]
                text-[length:var(--text-xs)]
                font-[family-name:var(--font-mono)]
              "
            >
              {missingDocs.map((name) => (
                <li
                  key={name}
                  className="
                    px-[var(--space-2)] py-[var(--space-0-5)]
                    rounded-[var(--radius-sm)]
                    bg-[var(--color-surface)]
                    border border-[var(--color-border-subtle)]
                    text-[color:var(--color-text-secondary)]
                  "
                >
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mb-[var(--space-6)] flex items-baseline justify-between">
        <p
          className="
            text-[length:var(--text-sm)]
            text-[color:var(--color-text-tertiary)]
          "
        >
          <span className="tabular-nums font-[var(--weight-semibold)] text-[color:var(--color-text-primary)]">
            {components.length}
          </span>{" "}
          component{components.length === 1 ? "" : "s"} documented
        </p>
        <Link
          href="/wiki/docs/tech-stack"
          className="
            text-[length:var(--text-sm)]
            font-[var(--weight-semibold)]
            text-[color:var(--color-accent)]
            hover:text-[color:var(--color-accent-hover)]
          "
        >
          Stack rationale →
        </Link>
      </div>

      <ul
        role="list"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--space-4)]"
      >
        {components.map((component) => (
          <li key={component.slug}>
            <Link
              href={`/wiki/design-system/${component.slug}`}
              className="
                group
                block h-full
                rounded-[var(--radius-lg)]
                border border-[var(--color-border-subtle)]
                bg-[var(--color-surface)]
                p-[var(--space-5)]
                transition-all duration-[var(--duration-fast)]
                hover:border-[var(--color-accent)] hover:shadow-[var(--shadow-sm)]
              "
            >
              <div className="flex items-start justify-between gap-[var(--space-3)]">
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
                  <Box size={18} strokeWidth={2} />
                </span>
                <ArrowRight
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="text-[color:var(--color-text-tertiary)] group-hover:text-[color:var(--color-accent)] transition-colors duration-[var(--duration-fast)]"
                />
              </div>
              <h3
                className="
                  mt-[var(--space-3)]
                  font-[family-name:var(--font-display)]
                  text-[length:var(--text-base)]
                  font-[var(--weight-semibold)]
                  text-[color:var(--color-text-primary)]
                "
              >
                {component.title}
              </h3>
              <p
                className="
                  mt-[var(--space-1)]
                  text-[length:var(--text-sm)]
                  text-[color:var(--color-text-secondary)]
                  leading-[var(--leading-relaxed)]
                  line-clamp-3
                "
              >
                {component.summary || "Open to read the full doc."}
              </p>
              <p
                className="
                  mt-[var(--space-3)]
                  text-[length:var(--text-xs)]
                  text-[color:var(--color-text-tertiary)]
                  font-[family-name:var(--font-mono)]
                  truncate
                "
              >
                {component.relativePath}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </WikiShell>
  );
}
