import { promises as fs } from "fs";
import path from "path";

/**
 * Design-system index
 * ===================
 * Walks `src/components/*` and returns the list of components that ship with
 * a co-located `.md` doc. This is how the wiki surfaces the component library
 * — the code is the source of truth, this just reads what's already there.
 *
 * A component directory qualifies if it contains a file named `<dir>.md`.
 * The title is lifted from the first H1 of that file.
 */

export type ComponentDoc = {
  slug: string;        // Directory name, e.g. "checkbox"
  title: string;       // First H1 from the .md file
  summary: string;     // First paragraph after H1, ~180 chars
  mdPath: string;      // Absolute file path (docs/source of truth)
  relativePath: string;
};

export type ComponentIndex = {
  components: ComponentDoc[];
  missingDocs: string[]; // Directories that have a .tsx but no sibling .md — drift flag
};

const COMPONENTS_ROOT = () => path.join(process.cwd(), "src", "components");

function extractTitle(raw: string, fallback: string): string {
  const m = raw.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : fallback;
}

function extractSummary(raw: string): string {
  const body = raw.replace(/^#\s+.+?\n+/m, "");
  // First real paragraph — may be a "## Purpose" heading followed by prose.
  const firstProse =
    body
      .split(/\n\n+/)
      .map((p) => p.trim())
      .find((p) => p.length > 0 && !p.startsWith("#") && !p.startsWith(">"));
  const cleaned = (firstProse ?? "")
    .replace(/[*_`]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 180 ? cleaned.slice(0, 177).trimEnd() + "…" : cleaned;
}

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export async function listComponentDocs(): Promise<ComponentIndex> {
  const root = COMPONENTS_ROOT();
  let entries: string[];
  try {
    entries = await fs.readdir(root);
  } catch {
    return { components: [], missingDocs: [] };
  }

  const components: ComponentDoc[] = [];
  const missingDocs: string[] = [];

  for (const name of entries) {
    const dirPath = path.join(root, name);
    const stat = await fs.stat(dirPath).catch(() => null);
    if (!stat?.isDirectory()) continue;

    const mdPath = path.join(dirPath, `${name}.md`);
    const tsxPath = path.join(dirPath, `${name}.tsx`);

    const [hasMd, hasTsx] = await Promise.all([
      fs.stat(mdPath).then(() => true).catch(() => false),
      fs.stat(tsxPath).then(() => true).catch(() => false),
    ]);

    if (!hasMd) {
      if (hasTsx) missingDocs.push(name);
      continue;
    }

    const raw = await fs.readFile(mdPath, "utf8");
    components.push({
      slug: name,
      title: extractTitle(raw, titleCase(name)),
      summary: extractSummary(raw),
      mdPath,
      relativePath: `src/components/${name}/${name}.md`,
    });
  }

  components.sort((a, b) => a.title.localeCompare(b.title));
  missingDocs.sort();

  return { components, missingDocs };
}

/** Read a single component's .md body. */
export async function getComponentDoc(slug: string): Promise<(ComponentDoc & { body: string }) | null> {
  const { components } = await listComponentDocs();
  const meta = components.find((c) => c.slug === slug);
  if (!meta) return null;
  const body = await fs.readFile(meta.mdPath, "utf8");
  return { ...meta, body };
}
