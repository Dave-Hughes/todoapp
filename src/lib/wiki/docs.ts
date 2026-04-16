import { promises as fs } from "fs";
import path from "path";
import matter from "gray-matter";

/**
 * Wiki docs loader
 * ================
 * Reads markdown docs from the repo so the /wiki route can browse them.
 *
 * Categories are semantic buckets — they drive the nav grouping on the wiki.
 * To add a new doc, drop a markdown file in the right folder; the loader
 * picks it up by convention.
 *
 * All fs reads are anchored at `process.cwd()`, which on Vercel resolves to
 * the project root where the `docs/` folder ships alongside the build.
 */

export type DocCategory = "foundation" | "operations" | "handoffs" | "specs" | "plans";

export type WikiDoc = {
  slug: string;          // URL-safe: "vision", "specs/2026-04-12-today-view-delight-design"
  title: string;         // First H1 or formatted fallback
  category: DocCategory;
  summary: string;       // First paragraph, ~180 chars
  filePath: string;      // Absolute path on disk
  relativePath: string;  // Relative to repo root, for display
  updatedAt: string;     // ISO date from file mtime
};

const DOCS_ROOT = () => path.join(process.cwd(), "docs");

/** Docs that appear in the foundation bucket. Stable, curated order. */
const FOUNDATION_ORDER = [
  "vision",
  "personas",
  "scope-v1",
  "principles",
  "voice-and-tone",
  "themes",
  "tech-stack",
] as const;

const OPERATIONS = ["open-questions"] as const;

/** Files we intentionally skip (superseded, empty, or noise). */
const SKIP = new Set(["session-start.md"]);

/* ================================================================
 * Helpers
 * ================================================================ */

function extractTitle(raw: string, fallback: string): string {
  const m = raw.match(/^#\s+(.+?)\s*$/m);
  if (m) return m[1].trim();
  return fallback;
}

/** First paragraph after the H1, stripped of markdown formatting. */
function extractSummary(raw: string): string {
  // Drop frontmatter, the H1 line, and any blank lines, then take the first
  // paragraph until the next blank line or heading.
  const body = raw
    .replace(/^---[\s\S]*?---\n/, "")
    .replace(/^#\s+.+?\n+/m, "");
  const firstPara = body.split(/\n\n+/).find((p) => p.trim().length > 0) ?? "";
  const cleaned = firstPara
    .replace(/[*_`>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 180 ? cleaned.slice(0, 177).trimEnd() + "…" : cleaned;
}

function prettifySlug(slug: string): string {
  return slug
    .replace(/^\d{4}-\d{2}-\d{2}-/, "")
    .split("/")
    .pop()!
    .split("-")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

async function readDoc(
  filePath: string,
  slug: string,
  category: DocCategory,
  relativePath: string,
): Promise<WikiDoc> {
  const [raw, stat] = await Promise.all([
    fs.readFile(filePath, "utf8"),
    fs.stat(filePath),
  ]);
  const { content } = matter(raw);
  return {
    slug,
    category,
    title: extractTitle(content, prettifySlug(slug)),
    summary: extractSummary(content),
    filePath,
    relativePath,
    updatedAt: stat.mtime.toISOString(),
  };
}

/* ================================================================
 * Public API
 * ================================================================ */

/** List every wiki doc across categories, sorted sensibly per bucket. */
export async function listDocs(): Promise<WikiDoc[]> {
  const root = DOCS_ROOT();
  const entries = await fs.readdir(root, { withFileTypes: true });

  const topLevelMd = entries
    .filter((e) => e.isFile() && e.name.endsWith(".md") && !SKIP.has(e.name))
    .map((e) => e.name);

  const docs: WikiDoc[] = [];

  for (const filename of topLevelMd) {
    const slug = filename.replace(/\.md$/, "");
    const category: DocCategory = FOUNDATION_ORDER.includes(slug as typeof FOUNDATION_ORDER[number])
      ? "foundation"
      : OPERATIONS.includes(slug as typeof OPERATIONS[number])
        ? "operations"
        : slug.startsWith("session-handoff-")
          ? "handoffs"
          : "foundation";
    docs.push(
      await readDoc(path.join(root, filename), slug, category, `docs/${filename}`),
    );
  }

  // Superpowers: specs + plans
  for (const sub of ["specs", "plans"] as const) {
    const dir = path.join(root, "superpowers", sub);
    try {
      const files = await fs.readdir(dir);
      for (const filename of files.filter((f) => f.endsWith(".md"))) {
        const baseSlug = filename.replace(/\.md$/, "");
        const slug = `${sub}/${baseSlug}`;
        docs.push(
          await readDoc(
            path.join(dir, filename),
            slug,
            sub,
            `docs/superpowers/${sub}/${filename}`,
          ),
        );
      }
    } catch {
      // Folder may not exist — skip.
    }
  }

  return sortDocs(docs);
}

/** Read a single doc by slug. Returns null if not found. */
export async function getDoc(slug: string): Promise<(WikiDoc & { body: string }) | null> {
  const docs = await listDocs();
  const meta = docs.find((d) => d.slug === slug);
  if (!meta) return null;
  const raw = await fs.readFile(meta.filePath, "utf8");
  const { content } = matter(raw);
  return { ...meta, body: content };
}

/** Group docs by category in the canonical display order. */
export function groupDocs(docs: WikiDoc[]): Array<{ category: DocCategory; title: string; docs: WikiDoc[] }> {
  const buckets: Array<{ category: DocCategory; title: string }> = [
    { category: "foundation", title: "Foundation" },
    { category: "operations", title: "Operations" },
    { category: "specs", title: "Specs" },
    { category: "plans", title: "Plans" },
    { category: "handoffs", title: "Session handoffs" },
  ];
  return buckets
    .map(({ category, title }) => ({
      category,
      title,
      docs: docs.filter((d) => d.category === category),
    }))
    .filter((b) => b.docs.length > 0);
}

/* ================================================================
 * Internal
 * ================================================================ */

function sortDocs(docs: WikiDoc[]): WikiDoc[] {
  return [...docs].sort((a, b) => {
    // Foundation docs follow a curated order; everything else sorts by title.
    if (a.category === "foundation" && b.category === "foundation") {
      const ai = FOUNDATION_ORDER.indexOf(a.slug as typeof FOUNDATION_ORDER[number]);
      const bi = FOUNDATION_ORDER.indexOf(b.slug as typeof FOUNDATION_ORDER[number]);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
    }
    // Dated specs/plans/handoffs: newest first.
    const aDate = extractDate(a.slug);
    const bDate = extractDate(b.slug);
    if (aDate && bDate) return bDate.localeCompare(aDate);
    return a.title.localeCompare(b.title);
  });
}

function extractDate(slug: string): string | null {
  const m = slug.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}
