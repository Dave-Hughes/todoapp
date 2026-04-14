"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useCallback } from "react";

export interface ConfirmDialogAction {
  label: string;
  onClick: () => void;
  variant?: "destructive" | "default";
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  actions: ConfirmDialogAction[];
  cancelLabel?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  title,
  actions,
  cancelLabel = "Never mind",
}: ConfirmDialogProps) {
  const shouldReduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    requestAnimationFrame(() => {
      const firstButton = dialogRef.current?.querySelector<HTMLElement>(
        'button[data-action]'
      );
      firstButton?.focus();
    });

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled])'
        );
        if (!focusable || focusable.length === 0) return;

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
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen && previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.2, ease: [0.25, 1, 0.5, 1] }
            }
            className="
              relative z-10
              w-[min(calc(100vw-var(--space-8)),20rem)]
              bg-[var(--color-surface-elevated)]
              rounded-[var(--radius-xl)]
              shadow-[var(--shadow-lg)]
              border border-[var(--color-border-subtle)]
              p-[var(--space-6)]
              flex flex-col gap-[var(--space-4)]
            "
          >
            <h2
              id="confirm-dialog-title"
              className="
                text-[length:var(--text-base)] font-[var(--weight-semibold)]
                text-[color:var(--color-text-primary)]
                text-center
              "
            >
              {title}
            </h2>

            <div className="flex flex-col gap-[var(--space-2)]">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  data-action
                  onClick={action.onClick}
                  className={`
                    w-full py-[var(--space-3)] px-[var(--space-4)]
                    rounded-[var(--radius-md)]
                    text-[length:var(--text-sm)] font-[var(--weight-semibold)]
                    min-h-[var(--touch-target-min)]
                    transition-colors duration-[var(--duration-instant)]
                    ${
                      action.variant === "destructive"
                        ? "bg-[var(--color-destructive)] text-[color:var(--color-text-inverse)] hover:opacity-90"
                        : "bg-[var(--color-surface-dim)] text-[color:var(--color-text-primary)] hover:bg-[var(--color-border-subtle)]"
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}

              <button
                type="button"
                onClick={onClose}
                className="
                  w-full py-[var(--space-3)] px-[var(--space-4)]
                  rounded-[var(--radius-md)]
                  text-[length:var(--text-sm)] font-[var(--weight-medium)]
                  text-[color:var(--color-text-tertiary)]
                  hover:text-[color:var(--color-text-secondary)]
                  hover:bg-[var(--color-surface-dim)]
                  min-h-[var(--touch-target-min)]
                  transition-colors duration-[var(--duration-instant)]
                "
              >
                {cancelLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
