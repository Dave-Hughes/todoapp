import { WikiShell } from "@/components/wiki-shell/wiki-shell";
import { WikiProgress } from "@/components/wiki-progress/wiki-progress";
import { getBuildProgress } from "@/lib/wiki/progress";

/**
 * /wiki/progress
 * ==============
 * Detailed phase view, parsed from the "Build progress" section of CLAUDE.md.
 */

export const dynamic = "force-dynamic";

export default async function WikiProgressPage() {
  const summary = await getBuildProgress();
  return (
    <WikiShell
      activeSection="progress"
      eyebrow="Build"
      title="Progress"
      subtitle="Every phase from CLAUDE.md, parsed live. Update the markdown and this view updates with it — one source of truth."
    >
      <WikiProgress summary={summary} />
    </WikiShell>
  );
}
