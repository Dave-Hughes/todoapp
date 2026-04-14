"use client";

import { motion, AnimatePresence, useReducedMotion, type PanInfo } from "framer-motion";
import { useEffect, useCallback, useRef } from "react";

/**
 * "sheet"   — full-bleed bottom sheet (default, mobile-idiomatic).
 * "card"    — floating card variant: centered, max-width constrained,
 *             raised above the viewport bottom. Used by TaskSheet on desktop.
 */
export type BottomSheetVariant = "sheet" | "card";

/**
 * "auto"   — max-h-[85dvh] overflow-y-auto (default).
 * "fit"    — shrinks to content height (no max-height cap). Good for short
 *            forms that don't need scrolling.
 */
export type BottomSheetHeightMode = "auto" | "fit";

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional heading rendered below the drag handle. Also used as aria-label if ariaLabel is not provided. */
  title?: string;
  /**
   * Explicit ARIA label for the dialog element. When provided, overrides `title`
   * as the dialog's accessible name. Use this when you want to label the dialog
   * without rendering a visible heading (e.g. TaskSheet manages its own header).
   */
  ariaLabel?: string;
  /**
   * Visual variant.
   * - "sheet": full-bleed bottom-anchored (default — mobile).
   * - "card":  centered floating card raised from the viewport bottom.
   *            Supply `cardMaxWidth` to override the default 768px cap.
   */
  variant?: BottomSheetVariant;
  /**
   * Max-width CSS value for the "card" variant. Defaults to
   * `var(--content-max-width)`.
   */
  cardMaxWidth?: string;
  /**
   * Height behaviour.
   * - "auto": capped at 85dvh, scrolls tall content (default).
   * - "fit":  no height cap; sheet wraps its content exactly.
   */
  heightMode?: BottomSheetHeightMode;
  /**
   * Whether to show the drag handle pill.
   * Defaults to `true` for "sheet" variant, `false` for "card" variant.
   * Pass explicitly to override.
   */
  showDragHandle?: boolean;
  /**
   * Additional className merged onto the sheet's outermost motion.div.
   * Use sparingly — prefer variant/heightMode for structural concerns.
   * Intended for responsive overrides (e.g. `lg:bottom-[var(--space-6)]`).
   */
  sheetClassName?: string;
  /**
   * Additional className merged onto the content wrapper div inside the sheet.
   */
  contentClassName?: string;
  /**
   * Additional className merged onto the drag handle container div.
   * Use to hide the handle at specific breakpoints (e.g. `lg:hidden` in TaskSheet).
   */
  dragHandleClassName?: string;
  children: React.ReactNode;
}

const DRAG_CLOSE_THRESHOLD = 100;

export function BottomSheet({
  isOpen,
  onClose,
  title,
  ariaLabel,
  variant = "sheet",
  cardMaxWidth,
  heightMode = "auto",
  showDragHandle,
  sheetClassName,
  contentClassName,
  dragHandleClassName,
  children,
}: BottomSheetProps) {
  const shouldReduceMotion = useReducedMotion();
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Resolve drag handle visibility: explicit prop wins; otherwise default by variant.
  const dragHandleVisible = showDragHandle ?? (variant === "sheet");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap: Tab cycles within the sheet
      if (e.key === "Tab" && sheetRef.current) {
        const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      // Store previous focus to restore on close
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";

      // Auto-focus the first focusable element in the sheet
      requestAnimationFrame(() => {
        const firstInput = sheetRef.current?.querySelector<HTMLElement>(
          "input, textarea, select, button"
        );
        firstInput?.focus();
      });
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > DRAG_CLOSE_THRESHOLD) {
      onClose();
    }
  }

  // Sheet positioning classes by variant
  const positionClasses =
    variant === "card"
      ? [
          "fixed bottom-[var(--space-6)] z-[var(--z-sheet)]",
          "left-1/2 -translate-x-1/2",
          "w-full",
          cardMaxWidth ? "" : "max-w-[var(--content-max-width)]",
          "rounded-[var(--radius-xl)]",
        ]
          .filter(Boolean)
          .join(" ")
      : [
          "fixed inset-x-0 bottom-0 z-[var(--z-sheet)]",
          "rounded-t-[var(--radius-xl)]",
          "pb-[env(safe-area-inset-bottom)]",
        ].join(" ");

  const heightClasses =
    heightMode === "fit" ? "" : "max-h-[85dvh] overflow-y-auto";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            onClick={onClose}
            className="
              fixed inset-0 z-[var(--z-overlay)]
              bg-[var(--color-overlay)]
            "
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel ?? title ?? "Bottom sheet"}
            initial={shouldReduceMotion ? { opacity: 0 } : { y: "100%" }}
            animate={shouldReduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { y: "100%" }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: "tween", duration: 0.35, ease: [0.25, 1, 0.5, 1] }
            }
            drag={dragHandleVisible ? "y" : false}
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            style={cardMaxWidth ? { maxWidth: cardMaxWidth } : undefined}
            className={[
              positionClasses,
              heightClasses,
              "bg-[var(--color-surface-elevated)]",
              "shadow-[var(--shadow-lg)]",
              sheetClassName,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {/* Drag handle (conditionally shown) */}
            {dragHandleVisible && (
              <div className={["flex justify-center pt-[var(--space-3)] pb-[var(--space-2)]", dragHandleClassName].filter(Boolean).join(" ")}>
                <div
                  className="h-1 w-8 rounded-[var(--radius-full)] bg-[var(--color-border)]"
                  aria-hidden="true"
                />
              </div>
            )}

            {/* Header */}
            {title && (
              <div className="px-[var(--space-4)] pb-[var(--space-3)]">
                <h2 className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] font-[var(--weight-semibold)] text-[color:var(--color-text-primary)]">
                  {title}
                </h2>
              </div>
            )}

            {/* Content */}
            <div className={["px-[var(--space-4)] pb-[var(--space-6)]", contentClassName].filter(Boolean).join(" ")}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
