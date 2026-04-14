"use client";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  showNotification?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "h-7 w-7 text-[length:var(--text-xs)]",
  md: "h-9 w-9 text-[length:var(--text-sm)]",
  lg: "h-11 w-11 text-[length:var(--text-base)]",
} as const;

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

/**
 * Generates a deterministic warm hue from a name.
 * Stays within the warm range (20°-60°) to complement the Cozy theme.
 */
function getHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Constrain to warm hue range: 20° to 60°
  return 20 + (Math.abs(hash) % 40);
}

export function Avatar({
  name,
  size = "md",
  showNotification = false,
  className = "",
}: AvatarProps) {
  const initial = getInitial(name);
  const hue = getHue(name);

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`
          ${sizeMap[size]}
          inline-flex items-center justify-center rounded-[var(--radius-full)]
          font-[var(--weight-semibold)] leading-none select-none
        `}
        style={{
          background: `oklch(90% 0.06 ${hue})`,
          color: `oklch(35% 0.1 ${hue})`,
        }}
        role="img"
        aria-label={name}
      >
        {initial}
      </div>
      {showNotification && (
        <span
          className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-[var(--radius-full)] bg-[var(--color-accent)] ring-[2px] ring-[color:var(--color-surface)]"
          aria-label="New notification"
        />
      )}
    </div>
  );
}
