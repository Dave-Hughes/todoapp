"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The icon element (e.g., <X size={18} />) */
  icon: ReactNode;
  /** Accessible label (required since there's no visible text) */
  label: string;
  /** Color variant */
  variant?: "default" | "success" | "warning" | "destructive";
  /** Size variant */
  size?: "sm" | "md";
}

const VARIANT_CLASSES = {
  default: "text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-secondary)] hover:bg-[var(--color-surface-dim)]",
  success: "text-[color:var(--color-success)] hover:bg-[var(--color-success-subtle)]",
  warning: "text-[color:var(--color-warning)] hover:bg-[var(--color-warning-subtle)]",
  destructive: "text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-destructive)] hover:bg-[var(--color-surface-dim)]",
} as const;

const SIZE_CLASSES = {
  sm: "p-[var(--space-1-5)]",
  md: "p-[var(--space-2)]",
} as const;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ icon, label, variant = "default", size = "md", className = "", disabled, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        disabled={disabled}
        className={`
          ${SIZE_CLASSES[size]}
          rounded-[var(--radius-md)]
          min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)]
          flex items-center justify-center
          transition-colors duration-[var(--duration-instant)]
          outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]
          disabled:opacity-[var(--opacity-disabled,0.5)] disabled:cursor-not-allowed
          ${disabled ? "" : VARIANT_CLASSES[variant]}
          ${className}
        `}
        {...props}
      >
        {icon}
      </button>
    );
  }
);
