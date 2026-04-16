"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

type PopoverPlacement = "bottom-start" | "bottom-center" | "bottom-end";

export interface PopoverProps {
  /** Whether the popover is open. Controlled by the parent. */
  isOpen: boolean;
  /** Called when the popover should close (Escape, click outside). */
  onClose: () => void;
  /** The trigger element ref — popover positions relative to this. */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Placement relative to the anchor. Default: "bottom-start". */
  placement?: PopoverPlacement;
  /** ARIA role for the popover container. Omit if the child component owns its own role. */
  role?: "dialog" | "listbox" | "menu" | "grid";
  /** Accessible label for the popover. */
  ariaLabel: string;
  /** Popover content. */
  children: ReactNode;
  /** Additional className for the popover container. */
  className?: string;
}

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const OFFSET = 8;
const VIEWPORT_PADDING = 8;

/**
 * Popover
 *
 * Portal-rendered, click-triggered popover that positions relative to an
 * anchor element. Used by task sheet chip pickers. Closes on Escape or
 * click outside. Focus moves into the popover on open and returns to
 * the anchor on close.
 *
 * Positioning: prefers opening below the anchor. If the popover would be
 * clipped by the viewport bottom, it flips above the anchor. Horizontal
 * position is clamped to stay within viewport bounds.
 */
export function Popover({
  isOpen,
  onClose,
  anchorRef,
  placement = "bottom-start",
  role,
  ariaLabel,
  children,
  className = "",
}: PopoverProps) {
  const shouldReduceMotion = useReducedMotion();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    flipped: boolean;
  } | null>(null);

  /* Position the popover relative to the anchor, measuring actual size */
  const reposition = useCallback(() => {
    if (!anchorRef.current || !popoverRef.current) return;

    const anchor = anchorRef.current.getBoundingClientRect();
    const popover = popoverRef.current.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    // Horizontal alignment
    let left: number;
    switch (placement) {
      case "bottom-center":
        left = anchor.left + anchor.width / 2 - popover.width / 2;
        break;
      case "bottom-end":
        left = anchor.right - popover.width;
        break;
      case "bottom-start":
      default:
        left = anchor.left;
        break;
    }

    // Clamp horizontal to viewport
    left = Math.max(VIEWPORT_PADDING, Math.min(left, vw - popover.width - VIEWPORT_PADDING));

    // Vertical: prefer below, flip above if clipped
    const spaceBelow = vh - anchor.bottom - OFFSET;
    const spaceAbove = anchor.top - OFFSET;
    const fitsBelow = spaceBelow >= popover.height;
    const flipped = !fitsBelow && spaceAbove > spaceBelow;

    const top = flipped
      ? anchor.top - OFFSET - popover.height
      : anchor.bottom + OFFSET;

    setPos({ top, left, flipped });
  }, [anchorRef, placement]);

  /* Initial position: render off-screen to measure, then reposition */
  useIsoLayoutEffect(() => {
    if (!isOpen) {
      setPos(null);
      return;
    }
    // First frame: place off-screen so we can measure
    setPos({ top: -9999, left: -9999, flipped: false });
  }, [isOpen]);

  /* Once the popover renders (even off-screen), measure and reposition */
  useIsoLayoutEffect(() => {
    if (!isOpen || !pos) return;
    if (pos.top === -9999) {
      // Element is now in DOM — measure and compute real position
      requestAnimationFrame(() => reposition());
    }
  }, [isOpen, pos, reposition]);

  /* Reposition on scroll/resize */
  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen, reposition]);

  /* Focus management: move focus into popover on open */
  useEffect(() => {
    if (!isOpen || !pos || pos.top === -9999) return;
    requestAnimationFrame(() => {
      const firstFocusable = popoverRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    });
  }, [isOpen, pos]);

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, onClose]);

  /* Close on click outside */
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    }
    const id = setTimeout(() => {
      document.addEventListener("mousedown", handleClick, true);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handleClick, true);
    };
  }, [isOpen, onClose, anchorRef]);

  const isVisible = pos && pos.top !== -9999;

  const transformOrigin = pos?.flipped
    ? placement === "bottom-end"
      ? "bottom right"
      : placement === "bottom-center"
        ? "bottom center"
        : "bottom left"
    : placement === "bottom-end"
      ? "top right"
      : placement === "bottom-center"
        ? "top center"
        : "top left";

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && pos && (
        <motion.div
          ref={popoverRef}
          role={role}
          aria-label={ariaLabel}
          aria-modal={false}
          initial={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.95, y: pos.flipped ? 4 : -4 }
          }
          animate={
            shouldReduceMotion
              ? { opacity: isVisible ? 1 : 0 }
              : {
                  opacity: isVisible ? 1 : 0,
                  scale: isVisible ? 1 : 0.95,
                  y: 0,
                }
          }
          exit={
            shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.15, ease: [0.25, 1, 0.5, 1] }
          }
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            transformOrigin,
            zIndex: "var(--z-popover)" as unknown as number,
          }}
          className={[
            "bg-[var(--color-surface-elevated)]",
            "border border-[var(--color-border-subtle)]",
            "rounded-[var(--radius-lg)]",
            "shadow-[var(--shadow-lg)]",
            "overflow-hidden",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
