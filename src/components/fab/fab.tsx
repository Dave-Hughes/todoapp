"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";

interface FabProps {
  onClick: () => void;
  label?: string;
  /**
   * When true the FAB hides itself on mobile.
   * Pass `sheetOpen` from the parent so the FAB doesn't peek behind the sheet.
   * On desktop the FAB is already `lg:hidden`; this prop is a no-op there.
   */
  isSheetOpen?: boolean;
}

export function Fab({ onClick, label = "Add task", isSheetOpen = false }: FabProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      onClick={onClick}
      aria-label={label}
      initial={shouldReduceMotion ? {} : { scale: 0, opacity: 0 }}
      animate={
        isSheetOpen
          ? shouldReduceMotion
            ? { opacity: 0, pointerEvents: "none" }
            : { scale: 0, opacity: 0, pointerEvents: "none" }
          : { scale: 1, opacity: 1, pointerEvents: "auto" }
      }
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.3, ease: [0.25, 1, 0.5, 1], delay: isSheetOpen ? 0 : 0.2 }
      }
      whileTap={shouldReduceMotion ? {} : { scale: 0.92 }}
      aria-hidden={isSheetOpen ? "true" : undefined}
      tabIndex={isSheetOpen ? -1 : undefined}
      className="
        lg:hidden
        fixed z-[var(--z-fab)]
        right-[var(--fab-offset)] bottom-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom,0px)+var(--fab-offset))]
        h-[var(--fab-size)] w-[var(--fab-size)]
        rounded-[var(--radius-full)]
        bg-[var(--color-accent)] text-[color:var(--color-accent-text)]
        shadow-[var(--shadow-accent-glow)]
        flex items-center justify-center
        hover:bg-[var(--color-accent-hover)]
        active:shadow-[var(--shadow-sm)]
        transition-all duration-[var(--duration-instant)]
      "
    >
      <Plus size={24} strokeWidth={2.5} aria-hidden="true" />
    </motion.button>
  );
}
