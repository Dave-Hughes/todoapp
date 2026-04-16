"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

/**
 * WikiMarkdown
 * ============
 * Theme-aware markdown renderer for /wiki doc pages. All typography, color,
 * spacing, and radii pull from theme tokens — the output automatically
 * restyles under any theme (Cozy today; others later).
 *
 * Supports GFM: tables, task lists, strikethrough, autolinks.
 *
 * Intentionally *not* using MDX. Docs stay plain markdown so humans and other
 * sessions can author them in any editor. If a doc ever needs interactive
 * React content, add it as a component elsewhere and link to it.
 */

interface WikiMarkdownProps {
  children: string;
  className?: string;
}

const components: Components = {
  h1: ({ children }) => (
    <h1
      className="
        font-[family-name:var(--font-display)]
        text-[length:var(--text-2xl)] lg:text-[length:var(--text-3xl)]
        font-[var(--weight-bold)]
        text-[color:var(--color-text-primary)]
        leading-[var(--leading-tight)] tracking-tight
        mt-[var(--space-12)] first:mt-0
        mb-[var(--space-4)]
      "
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2
      className="
        font-[family-name:var(--font-display)]
        text-[length:var(--text-xl)]
        font-[var(--weight-semibold)]
        text-[color:var(--color-text-primary)]
        leading-[var(--leading-tight)] tracking-tight
        mt-[var(--space-8)] first:mt-0
        mb-[var(--space-3)]
        pb-[var(--space-2)]
        border-b border-[var(--color-border-subtle)]
      "
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      className="
        font-[family-name:var(--font-display)]
        text-[length:var(--text-lg)]
        font-[var(--weight-semibold)]
        text-[color:var(--color-text-primary)]
        leading-[var(--leading-tight)]
        mt-[var(--space-6)]
        mb-[var(--space-2)]
      "
    >
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4
      className="
        font-[family-name:var(--font-display)]
        text-[length:var(--text-base)]
        font-[var(--weight-semibold)]
        text-[color:var(--color-text-primary)]
        mt-[var(--space-6)] mb-[var(--space-2)]
      "
    >
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p
      className="
        text-[length:var(--text-base)]
        text-[color:var(--color-text-primary)]
        leading-[var(--leading-relaxed)]
        my-[var(--space-4)]
      "
    >
      {children}
    </p>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="
        text-[color:var(--color-accent)]
        hover:text-[color:var(--color-accent-hover)]
        underline decoration-[var(--color-accent-subtle)]
        underline-offset-4
        transition-colors duration-[var(--duration-fast)]
      "
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul
      className="
        list-disc pl-[var(--space-6)]
        my-[var(--space-4)]
        space-y-[var(--space-2)]
        marker:text-[color:var(--color-text-tertiary)]
        text-[color:var(--color-text-primary)]
        leading-[var(--leading-relaxed)]
      "
    >
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol
      className="
        list-decimal pl-[var(--space-6)]
        my-[var(--space-4)]
        space-y-[var(--space-2)]
        marker:text-[color:var(--color-text-tertiary)]
        text-[color:var(--color-text-primary)]
        leading-[var(--leading-relaxed)]
      "
    >
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-[var(--space-1)]">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote
      className="
        my-[var(--space-6)]
        pl-[var(--space-4)]
        border-l-2 border-[var(--color-accent)]
        bg-[var(--color-accent-subtle)]
        rounded-r-[var(--radius-md)]
        py-[var(--space-2)] pr-[var(--space-4)]
        text-[color:var(--color-text-secondary)]
        italic
      "
    >
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    // Block-level code has a language class; inline has none.
    const isBlock = (className ?? "").startsWith("language-");
    if (isBlock) {
      return (
        <code
          className="
            block whitespace-pre overflow-x-auto
            font-[family-name:var(--font-mono)]
            text-[length:var(--text-sm)]
            leading-[var(--leading-normal)]
            text-[color:var(--color-text-primary)]
          "
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="
          font-[family-name:var(--font-mono)]
          text-[length:var(--text-sm)]
          px-[var(--space-1-5)] py-[var(--space-0-5)]
          rounded-[var(--radius-sm)]
          bg-[var(--color-surface-dim)]
          text-[color:var(--color-text-primary)]
        "
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre
      className="
        my-[var(--space-4)]
        p-[var(--space-4)]
        rounded-[var(--radius-lg)]
        bg-[var(--color-surface-dim)]
        border border-[var(--color-border-subtle)]
        overflow-x-auto
      "
    >
      {children}
    </pre>
  ),
  hr: () => (
    <hr
      className="
        my-[var(--space-8)]
        border-0 border-t
        border-[var(--color-border-subtle)]
      "
    />
  ),
  table: ({ children }) => (
    <div className="my-[var(--space-6)] overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)]">
      <table className="w-full border-collapse text-[length:var(--text-sm)]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[var(--color-surface-dim)]">{children}</thead>
  ),
  tr: ({ children }) => (
    <tr className="border-b border-[var(--color-border-subtle)] last:border-b-0">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th
      className="
        text-left px-[var(--space-4)] py-[var(--space-3)]
        font-[var(--weight-semibold)]
        text-[color:var(--color-text-primary)]
      "
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td
      className="
        px-[var(--space-4)] py-[var(--space-3)]
        text-[color:var(--color-text-primary)]
        leading-[var(--leading-normal)]
        align-top
      "
    >
      {children}
    </td>
  ),
  strong: ({ children }) => (
    <strong className="font-[var(--weight-semibold)] text-[color:var(--color-text-primary)]">
      {children}
    </strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  // GFM checkbox list items render as <input type="checkbox"> — style inline.
  input: ({ type, checked, disabled }) => {
    if (type !== "checkbox") return null;
    return (
      <span
        aria-hidden="true"
        className={`
          inline-flex items-center justify-center
          w-4 h-4 mr-[var(--space-2)] -ml-[var(--space-5)]
          rounded-[var(--radius-sm)]
          border
          align-middle
          ${
            checked
              ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-[color:var(--color-accent-text)]"
              : "bg-[var(--color-surface)] border-[var(--color-border)]"
          }
          ${disabled ? "opacity-[var(--opacity-muted)]" : ""}
        `}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" aria-hidden="true">
            <path
              d="M2.5 6.5L5 9L9.5 3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    );
  },
};

export function WikiMarkdown({ children, className = "" }: WikiMarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
