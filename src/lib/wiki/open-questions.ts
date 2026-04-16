import { promises as fs } from "fs";
import path from "path";

/**
 * Open-questions parser
 * =====================
 * Extracts the shape of `docs/open-questions.md` for the wiki roadmap surface.
 * The doc uses a stable convention: each question is introduced by a bold
 * numbered heading like `**1. What's the real name of the app?**`, with
 * strikethrough (`~~...~~`) wrapping and a `✅` suffix on resolved items.
 */

export type OpenQuestion = {
  number: number;
  title: string;
  section: string;     // e.g. "Blocking before build"
  resolved: boolean;
};

export type OpenQuestionsSummary = {
  questions: OpenQuestion[];
  byStatus: { resolved: number; open: number; total: number };
  bySection: Array<{ section: string; questions: OpenQuestion[] }>;
};

export async function getOpenQuestions(): Promise<OpenQuestionsSummary> {
  const filePath = path.join(process.cwd(), "docs", "open-questions.md");
  const raw = await fs.readFile(filePath, "utf8").catch(() => "");
  return parseOpenQuestions(raw);
}

export function parseOpenQuestions(raw: string): OpenQuestionsSummary {
  const lines = raw.split(/\r?\n/);
  const questions: OpenQuestion[] = [];
  let currentSection = "Unfiled";

  for (const line of lines) {
    const secMatch = line.match(/^##\s+(.+?)\s*$/);
    if (secMatch) {
      currentSection = secMatch[1].trim();
      continue;
    }

    // Match `**1. Some question**` or `**~~1. ...~~**` with optional ✅
    const qMatch = line.match(/^\*\*(?:~~)?(\d+)\.\s+(.+?)(?:~~)?\*\*(.*)$/);
    if (!qMatch) continue;

    const [, numStr, body] = qMatch;
    const cleanTitle = body.replace(/~~/g, "").replace(/\s+$/, "").trim();
    const resolved = /✅/.test(line) || /~~/.test(line);

    questions.push({
      number: Number(numStr),
      title: cleanTitle,
      section: currentSection,
      resolved,
    });
  }

  const byStatus = {
    resolved: questions.filter((q) => q.resolved).length,
    open: questions.filter((q) => !q.resolved).length,
    total: questions.length,
  };

  // Group by section in order of first appearance.
  const seen = new Set<string>();
  const sectionOrder: string[] = [];
  for (const q of questions) {
    if (!seen.has(q.section)) {
      seen.add(q.section);
      sectionOrder.push(q.section);
    }
  }
  const bySection = sectionOrder.map((section) => ({
    section,
    questions: questions.filter((q) => q.section === section),
  }));

  return { questions, byStatus, bySection };
}
