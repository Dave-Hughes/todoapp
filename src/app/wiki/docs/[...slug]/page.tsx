import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { WikiShell } from "@/components/wiki-shell/wiki-shell";
import { WikiMarkdown } from "@/components/wiki-markdown/wiki-markdown";
import { getDoc, listDocs } from "@/lib/wiki/docs";

/**
 * /wiki/docs/[...slug]
 * ====================
 * Renders a single markdown doc. Slugs may contain a single slash (e.g.
 * `specs/2026-04-12-today-view-delight-design`) so we accept a catch-all.
 */

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function WikiDocPage({ params }: PageProps) {
  const { slug: slugParts } = await params;
  const slug = slugParts.join("/");
  const doc = await getDoc(slug);
  if (!doc) notFound();

  const categoryLabel: Record<string, string> = {
    foundation: "Foundation",
    operations: "Operations",
    handoffs: "Session handoff",
    specs: "Spec",
    plans: "Plan",
  };

  return (
    <WikiShell
      activeSection="docs"
      eyebrow={categoryLabel[doc.category] ?? "Doc"}
      title={doc.title}
      headerAction={
        <Link
          href="/wiki/docs"
          className="
            inline-flex items-center gap-[var(--space-2)]
            h-[var(--touch-target-min)] px-[var(--space-3)]
            rounded-[var(--radius-md)]
            text-[length:var(--text-sm)] font-[var(--weight-semibold)]
            text-[color:var(--color-text-secondary)]
            hover:bg-[var(--color-surface-dim)] hover:text-[color:var(--color-text-primary)]
            transition-colors duration-[var(--duration-fast)]
          "
        >
          <ArrowLeft size={16} strokeWidth={2.25} aria-hidden="true" />
          All docs
        </Link>
      }
    >
      <article
        className="
          rounded-[var(--radius-xl)]
          border border-[var(--color-border-subtle)]
          bg-[var(--color-surface)]
          p-[var(--space-6)] lg:p-[var(--space-12)]
          shadow-[var(--shadow-sm)]
        "
      >
        <p
          className="
            mb-[var(--space-6)]
            pb-[var(--space-4)]
            border-b border-[var(--color-border-subtle)]
            text-[length:var(--text-xs)]
            text-[color:var(--color-text-tertiary)]
            font-[family-name:var(--font-mono)]
          "
        >
          {doc.relativePath}
        </p>
        <WikiMarkdown>{doc.body}</WikiMarkdown>
      </article>
    </WikiShell>
  );
}

export async function generateStaticParams() {
  const docs = await listDocs();
  return docs.map((d) => ({ slug: d.slug.split("/") }));
}
