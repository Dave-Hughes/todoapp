import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { WikiShell } from "@/components/wiki-shell/wiki-shell";
import { WikiMarkdown } from "@/components/wiki-markdown/wiki-markdown";
import { getComponentDoc, listComponentDocs } from "@/lib/wiki/design-system";

/**
 * /wiki/design-system/[slug]
 * ==========================
 * Renders a single component's co-located .md doc.
 */

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ComponentDocPage({ params }: PageProps) {
  const { slug } = await params;
  const component = await getComponentDoc(slug);
  if (!component) notFound();

  return (
    <WikiShell
      activeSection="design-system"
      eyebrow="Component"
      title={component.title}
      headerAction={
        <Link
          href="/wiki/design-system"
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
          All components
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
          {component.relativePath}
        </p>
        <WikiMarkdown>{component.body}</WikiMarkdown>
      </article>
    </WikiShell>
  );
}

export async function generateStaticParams() {
  const { components } = await listComponentDocs();
  return components.map((c) => ({ slug: c.slug }));
}
