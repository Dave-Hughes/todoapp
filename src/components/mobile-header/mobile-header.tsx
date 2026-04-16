"use client";

import { UserPlus } from "lucide-react";
import { Avatar } from "../avatar/avatar";
import { MobilePoints } from "../points-display/points-display";

interface MobileHeaderProps {
  userName: string;
  partnerName?: string;
  userPoints: number;
  partnerPoints?: number;
  userPointsToday?: number;
  partnerPointsToday?: number;
  hasNotification?: boolean;
}

export function MobileHeader({
  userName,
  partnerName,
  userPoints,
  partnerPoints,
  userPointsToday = 0,
  partnerPointsToday = 0,
  hasNotification = false,
}: MobileHeaderProps) {
  const isSolo = !partnerName;

  return (
    <header
      className="
        lg:hidden flex items-center justify-between
        px-[var(--space-4)] h-[var(--header-height)]
        bg-[var(--color-surface)] border-b border-[var(--color-border-subtle)]
      "
    >
      {/* Points — both partners */}
      <MobilePoints
        userPoints={userPoints}
        partnerPoints={partnerPoints}
        userPointsToday={userPointsToday}
        partnerPointsToday={partnerPointsToday}
      />

      <div className="flex items-center gap-[var(--space-2)]">
        {/* Solo-state invite affordance — mirrors the sidebar's persistent
            invite entry. Stays visible even after the InviteBanner is
            dismissed; this is the always-reachable path to /invite on
            mobile. */}
        {isSolo && (
          <a
            href="/invite"
            aria-label="Bring your person in"
            title="Bring your person in"
            className="
              inline-flex items-center justify-center
              h-[var(--touch-target-min)] w-[var(--touch-target-min)]
              -mr-[var(--space-1)]
              rounded-[var(--radius-full)]
              text-[color:var(--color-accent)]
              hover:bg-[var(--color-accent-subtle)]
              transition-colors duration-[var(--duration-instant)]
            "
          >
            <UserPlus size={18} strokeWidth={2.25} aria-hidden="true" />
          </a>
        )}

        {/* Avatar with notification dot */}
        <Avatar name={userName} size="sm" showNotification={hasNotification} />
      </div>
    </header>
  );
}
