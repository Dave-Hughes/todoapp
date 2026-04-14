"use client";

import { useRef, useState, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Placement = "top" | "bottom" | "right" | "left";

interface TooltipProps {
  /** Visible label. */
  label: string;
  /** Optional keyboard shortcut hint rendered as a <kbd> (e.g. "⌘\", "Esc"). */
  shortcut?: string;
  /** Where the tooltip appears relative to the trigger. Default: "bottom". */
  placement?: Placement;
  /** Pointer-offset distance from the trigger in px. Default: 6. */
  offset?: number;
  /** Class applied to the wrapper span. Use to participate in parent layout (e.g. `w-full`). */
  className?: string;
  children: ReactNode;
}

/**
 * Portal-rendered tooltip that escapes overflow:hidden parents. Desktop-only
 * (hidden at < lg). Shows on pointer hover and keyboard focus.
 */
export function Tooltip({
  label,
  shortcut,
  placement = "bottom",
  offset = 6,
  className = "",
  children,
}: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const position = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    switch (placement) {
      case "top":
        setPos({ top: r.top - offset, left: r.left + r.width / 2 });
        break;
      case "right":
        setPos({ top: r.top + r.height / 2, left: r.right + offset });
        break;
      case "left":
        setPos({ top: r.top + r.height / 2, left: r.left - offset });
        break;
      case "bottom":
      default:
        setPos({ top: r.bottom + offset, left: r.left + r.width / 2 });
    }
  }, [placement, offset]);

  const handleEnter = useCallback(() => {
    position();
    setShow(true);
  }, [position]);

  const handleLeave = useCallback(() => setShow(false), []);

  const transform =
    placement === "top"
      ? "translate(-50%, -100%)"
      : placement === "right"
        ? "translate(0, -50%)"
        : placement === "left"
          ? "translate(-100%, -50%)"
          : "translate(-50%, 0)";

  return (
    <span
      ref={triggerRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      className={`relative inline-flex ${className}`}
    >
      {children}
      {typeof document !== "undefined" &&
        show &&
        pos &&
        createPortal(
          <span
            role="tooltip"
            className="
              pointer-events-none fixed
              inline-flex items-center gap-[var(--space-1-5)]
              px-[var(--space-2)] py-[var(--space-0-5)]
              rounded-[var(--radius-sm)]
              bg-[var(--color-text-primary)] text-[color:var(--color-text-inverse)]
              text-[length:var(--text-xs)] font-[var(--weight-medium)]
              whitespace-nowrap
              z-[var(--z-tooltip)]
              hidden lg:inline-flex
            "
            style={{
              top: pos.top,
              left: pos.left,
              transform,
            }}
          >
            <span>{label}</span>
            {shortcut && (
              <kbd
                className="
                  inline-flex items-center
                  px-[var(--space-1)]
                  rounded-[var(--radius-sm)]
                  bg-[color:color-mix(in_oklch,var(--color-text-inverse)_18%,transparent)]
                  text-[10px] font-[var(--weight-medium)]
                  tabular-nums leading-[1.4]
                "
              >
                {shortcut}
              </kbd>
            )}
          </span>,
          document.body,
        )}
    </span>
  );
}
