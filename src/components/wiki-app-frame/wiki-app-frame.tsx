"use client";

import { AppShell } from "../app-shell/app-shell";
import { useMe } from "@/lib/hooks/use-me";

/**
 * WikiAppFrame
 * ============
 * Thin client wrapper that pulls the same user/partner/points context the
 * Today view uses, so the Sidebar and MobileHeader render with live data
 * while server components above can still do filesystem reads for docs.
 *
 * Why it exists: /wiki pages are server components (they read markdown from
 * disk), but AppShell is a client component that needs live points data via
 * TanStack Query. This frame is the seam between them.
 */
interface WikiAppFrameProps {
  activePath: string;
  children: React.ReactNode;
}

export function WikiAppFrame({ activePath, children }: WikiAppFrameProps) {
  const { data: meData } = useMe();
  const me = meData?.me ?? null;
  const partner = meData?.partner ?? null;
  const mePoints = meData?.mePoints ?? { lifetime: 0, today: 0 };
  const partnerPoints = meData?.partnerPoints ?? null;

  return (
    <AppShell
      activePath={activePath}
      userName={me?.displayName ?? ""}
      partnerName={partner?.displayName ?? ""}
      userPoints={mePoints.lifetime}
      partnerPoints={partnerPoints?.lifetime}
      userPointsToday={mePoints.today}
      partnerPointsToday={partnerPoints?.today ?? 0}
      hasNotification={false}
    >
      {children}
    </AppShell>
  );
}
