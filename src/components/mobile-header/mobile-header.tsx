"use client";

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

      {/* Avatar with notification dot */}
      <Avatar name={userName} size="sm" showNotification={hasNotification} />
    </header>
  );
}
