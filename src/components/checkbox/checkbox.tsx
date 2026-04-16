"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EASE_OUT_QUART } from "../../lib/motion";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  className?: string;
}

/**
 * Checkbox: 18px visual circle with 44px invisible touch target via ::before pseudo.
 * The visual stays compact; the hit area expands without affecting layout.
 * Includes a radial bloom micro-celebration on completion.
 */
export function Checkbox({
  checked,
  onChange,
  disabled = false,
  label,
  className = "",
}: CheckboxProps) {
  const shouldReduceMotion = useReducedMotion();
  const [celebrateKey, setCelebrateKey] = useState(0);

  function handleClick() {
    // Fire bloom only on check (not uncheck)
    if (!checked) {
      setCelebrateKey((k) => k + 1);
    }
    onChange(!checked);
  }

  return (
    <button
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={handleClick}
      className={`
        checkbox-touch-target
        relative inline-flex items-center justify-center shrink-0
        w-[18px] h-[18px] rounded-full
        transition-colors duration-[var(--duration-instant)]
        ${
          checked
            ? "border-[1.5px] border-[var(--color-accent)] bg-[var(--color-accent)]"
            : "border-[1.5px] border-[var(--color-border)] bg-transparent hover:border-[var(--color-accent)]"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
    >
      {/* Radial bloom — decorative celebration on completion */}
      <AnimatePresence>
        {celebrateKey > 0 && (
          <motion.span
            key={celebrateKey}
            aria-hidden="true"
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: "var(--color-accent)" }}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0.4, scale: 1 }}
            animate={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 2.0 }}
            exit={{ opacity: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.4, ease: EASE_OUT_QUART }
            }
          />
        )}
      </AnimatePresence>

      {/* Scale pulse on the checkbox itself */}
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        animate={
          checked && !shouldReduceMotion
            ? { scale: [1, 1.15, 1] }
            : { scale: 1 }
        }
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: 0.3, ease: EASE_OUT_QUART }
        }
      />

      <svg
        viewBox="0 0 14 14"
        fill="none"
        className="relative w-[11px] h-[11px]"
        aria-hidden="true"
      >
        <motion.path
          d="M3 7.5L5.5 10L11 4"
          stroke="var(--color-accent-text)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{
            pathLength: checked ? 1 : 0,
            opacity: checked ? 1 : 0,
          }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : {
                  pathLength: {
                    duration: 0.25,
                    ease: EASE_OUT_QUART,
                  },
                  opacity: { duration: 0.1 },
                }
          }
        />
      </svg>
    </button>
  );
}
