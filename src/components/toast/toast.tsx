"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

interface ToastProps {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  isVisible: boolean;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({
  message,
  action,
  isVisible,
  onDismiss,
  duration = 6000,
}: ToastProps) {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [isVisible, onDismiss, duration]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.3, ease: [0.25, 1, 0.5, 1] }
          }
          className="
            fixed bottom-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom,0px)+var(--space-4))] lg:bottom-[var(--space-6)]
            left-[var(--space-4)] right-[var(--space-4)]
            lg:left-auto lg:right-[var(--space-6)] lg:max-w-sm
            z-[var(--z-toast)]
            flex items-center justify-between gap-[var(--space-3)]
            px-[var(--space-4)] py-[var(--space-3)]
            rounded-[var(--radius-lg)]
            shadow-[var(--shadow-lg)]
            text-[length:var(--text-sm)]
          "
          style={{
            backgroundColor: "var(--color-text-primary)",
            color: "var(--color-text-inverse)",
          }}
        >
          <span>{message}</span>
          {action && (
            <button
              onClick={action.onClick}
              className="
                shrink-0 hover:underline
                min-h-[var(--touch-target-min)]
                flex items-center
                font-[var(--weight-semibold)]
                text-[color:var(--color-accent)]
              "
            >
              {action.label}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
