import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { WikiShell } from "@/components/wiki-shell/wiki-shell";
import { groupDocs, listDocs } from "@/lib/wiki/docs";

/**
 * /wiki/docs
 * ==========
 * Browseable index of every markdown doc in /docs (and /docs/superpowers/*),
 * grouped by category with titles and one-line summaries.
 */

export const dynamic = "force-dynamic";

export default async function WikiDocsIndexPage() {
  const docs = await listDocs();
  const groups = groupDocs(docs);

  return (
    <WikiShell
      activeSection="docs"
      eyebrow="Reference"
      title="Docs"
      subtitle="The foundation. Read these before making calls that touch vision, scope, or voice — they resolve an enormous number of questions up front."
    >
      <div className="flex flex-col gap-[var(--space-10)]">
        {groups.map((group) => (
          <section key={group.category} aria-labelledby={`group-${group.category}`}>
            <h2
              id={`group-${group.category}`}
              className="
                font-[family-name:var(--font-display)]
                text-[length:var(--text-lg)]
                font-[var(--weight-semibold)]
                text-[color:var(--color-text-primary)]
                mb-[var(--space-4)]
                pb-[var(--space-2)]
                border-b border-[var(--color-border-subtle)]
              "
            >
              {group.title}
            </h2>
            <ul
              role="list"
              className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-3)]"
            >
              {group.docs.map((doc) => (
                <li key={doc.slug}>
                  <Link
                    href={`/wiki/docs/${doc.slug}`}
                    className="
                      group
                      block
                      rounded-[var(--radius-lg)]
                      border border-[var(--color-border-subtle)]
                      bg-[var(--color-surface)]
                      p-[var(--space-4)]
                      transition-all duration-[var(--duration-fast)]
                      hover:border-[var(--color-accent)] hover:shadow-[var(--shadow-sm)]
                    "
                  >
                    <div className="flex items-start gap-[var(--space-3)]">
                      <span
                        className="
                          shrink-0
                          flex items-center justify-center
                          w-[var(--space-8)] h-[var(--space-8)]
                          rounded-[var(--radius-md)]
                          bg-[var(--color-accent-subtle)]
                          text-[color:var(--color-accent)]
                          mt-[var(--space-0-5)]
                        "
                        aria-hidden="true"
                      >
                        <FileText size={16} strokeWidth={2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-[var(--space-2)]">
                          <h3
                            className="
                              font-[family-name:var(--font-display)]
                              text-[length:var(--text-base)]
                              font-[var(--weight-semibold)]
                              text-[color:var(--color-text-primary)]
                              leading-[var(--leading-tight)]
                              truncate
                            "
                          >
                            {doc.title}
                          </h3>
                          <ArrowRight
                            size={16}
                            strokeWidth={2}
                            aria-hidden="true"
                            className="shrink-0 text-[color:var(--color-text-tertiary)] group-hover:text-[color:var(--color-accent)] transition-colors duration-[var(--duration-fast)]"
                          />
                        </div>
                        <p
                          className="
                            mt-[var(--space-1)]
                            text-[length:var(--text-sm)]
                            text-[color:var(--color-text-secondary)]
                            leading-[var(--leading-normal)]
                            line-clamp-2
                          "
                        >
                          {doc.summary || "Open to read."}
                        </p>
                        <p
                          className="
                            mt-[var(--space-2)]
                            text-[length:var(--text-xs)]
                            text-[color:var(--color-text-tertiary)]
                            font-[family-name:var(--font-mono)]
                            truncate
                          "
                        >
                          {doc.relativePath}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </WikiShell>
  );
}
