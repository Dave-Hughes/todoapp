import { promises as fs } from "fs";
import path from "path";

/**
 * CLAUDE.md build-progress parser
 * ================================
 * Parses the "## Build progress" section of CLAUDE.md into a structured tree,
 * so the wiki can render it as a phases dashboard without duplicating the
 * source of truth. The file stays editable as a human-readable checklist;
 * this parser just mirrors it into the UI.
 *
 * Format expected (stable as of 2026-04-14):
 *
 *   ## Build progress
 *
 *   1. ✅ Product interview (foundation docs)
 *   2. ⏳ Something in progress
 *   3. Build (walking skeleton)
 *      - ✅ Phase 1: ...
 *      - ✅ Phase 1b: ...
 *   4. Keep updating docs after every major change
 */

export type PhaseStatus = "done" | "in-progress" | "upcoming";

export type Phase = {
  number: number;
  title: string;
  status: PhaseStatus;
  subItems: SubItem[];
  /** Non-checklist notes nested under the item (rendered as context). */
  notes: string[];
};

export type SubItem = {
  title: string;
  status: PhaseStatus;
};

export type ProgressSummary = {
  phases: Phase[];
  counts: Record<PhaseStatus, number>;
  totalItems: number; // phases + sub-items with an explicit status marker
  doneItems: number;
};

/** Tokens that indicate status. Keep in sync with CLAUDE.md conventions. */
const DONE_MARK = "✅";
const IN_PROGRESS_MARK = "⏳";

function statusFromLine(line: string): PhaseStatus {
  if (line.includes(DONE_MARK)) return "done";
  if (line.includes(IN_PROGRESS_MARK)) return "in-progress";
  return "upcoming";
}

function stripStatus(text: string): string {
  return text
    .replace(new RegExp(`${DONE_MARK}\\s*`, "g"), "")
    .replace(new RegExp(`${IN_PROGRESS_MARK}\\s*`, "g"), "")
    .trim();
}

export async function getBuildProgress(): Promise<ProgressSummary> {
  const claudeMd = path.join(process.cwd(), "CLAUDE.md");
  const raw = await fs.readFile(claudeMd, "utf8");
  return parseBuildProgress(raw);
}

/** Exported for unit-testability. */
export function parseBuildProgress(raw: string): ProgressSummary {
  const lines = raw.split(/\r?\n/);
  const startIdx = lines.findIndex((l) => /^##\s+Build progress\s*$/.test(l));
  if (startIdx === -1) return emptySummary();

  // Section ends at the next top-level heading.
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }

  const phases: Phase[] = [];
  let current: Phase | null = null;

  for (let i = startIdx + 1; i < endIdx; i++) {
    const line = lines[i];
    const phaseMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (phaseMatch) {
      if (current) phases.push(current);
      const [, numStr, rest] = phaseMatch;
      current = {
        number: Number(numStr),
        title: stripStatus(rest),
        status: statusFromLine(rest),
        subItems: [],
        notes: [],
      };
      continue;
    }

    if (!current) continue;

    // Sub-checklist item: 3+ spaces indent, then "- "
    const subMatch = line.match(/^\s{2,}-\s+(.*)$/);
    if (subMatch) {
      const text = subMatch[1];
      const hasMark = text.includes(DONE_MARK) || text.includes(IN_PROGRESS_MARK);
      if (hasMark) {
        current.subItems.push({
          title: stripStatus(text),
          status: statusFromLine(text),
        });
      } else {
        // Un-statused nested bullet — treat as a note.
        current.notes.push(stripStatus(text));
      }
      continue;
    }
  }
  if (current) phases.push(current);

  // Derive status for phases that have no explicit marker but have sub-items.
  for (const p of phases) {
    if (p.status !== "upcoming") continue;
    if (p.subItems.length === 0) continue;
    const anyInProgress = p.subItems.some((s) => s.status === "in-progress");
    const allDone = p.subItems.every((s) => s.status === "done");
    if (anyInProgress) p.status = "in-progress";
    else if (allDone) p.status = "done";
  }

  // Counts: count phases + sub-items (sub-items with explicit markers only).
  const counts: Record<PhaseStatus, number> = { done: 0, "in-progress": 0, upcoming: 0 };
  let totalItems = 0;
  let doneItems = 0;
  for (const p of phases) {
    totalItems += 1;
    counts[p.status] += 1;
    if (p.status === "done") doneItems += 1;
    for (const s of p.subItems) {
      totalItems += 1;
      counts[s.status] += 1;
      if (s.status === "done") doneItems += 1;
    }
  }

  return { phases, counts, totalItems, doneItems };
}

function emptySummary(): ProgressSummary {
  return {
    phases: [],
    counts: { done: 0, "in-progress": 0, upcoming: 0 },
    totalItems: 0,
    doneItems: 0,
  };
}
