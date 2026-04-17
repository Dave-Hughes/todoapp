"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";

type EmptyVariant = "no-tasks" | "caught-up" | "theirs-solo";

interface EmptyStateProps {
  variant: EmptyVariant;
  onAddTask?: () => void;
  completedCount?: number;
}

const caughtUpCopy = [
  "Nothing left today. You two are dangerous.",
  "All clear. The rest of today is yours.",
  "Done and done. Go enjoy something.",
  "Clean slate. What trouble are you two getting into?",
];

/**
 * Picks a rotating copy variant deterministically based on the date,
 * so the same line doesn't show twice in a row across days.
 */
function getDayOfYear(): number {
  return Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
}

function getCaughtUpCopy(): string {
  return caughtUpCopy[getDayOfYear() % caughtUpCopy.length];
}

const theirsSoloCopy = [
  "This is where your person's tasks will live.",
  "Your person's side is waiting.",
  "Nothing here yet — that's their column.",
  "Once they're in, this page fills up.",
];

function getTheirsSoloCopy(): string {
  return theirsSoloCopy[getDayOfYear() % theirsSoloCopy.length];
}

function getSummaryCopy(count: number): string {
  const n = count === 1 ? "one thing" : `${count} things`;
  const variants = [
    `You two knocked out ${n} today.`,
    `${count === 1 ? "One thing" : `${count} things`} handled between you two.`,
    `That's ${n} off the list. Not bad.`,
  ];
  return variants[getDayOfYear() % variants.length];
}

export function EmptyState({ variant, onAddTask, completedCount }: EmptyStateProps) {
  const shouldReduceMotion = useReducedMotion();

  if (variant === "theirs-solo") {
    return (
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
        className="flex flex-col items-center justify-center py-[var(--space-12)] px-[var(--space-6)] text-center"
      >
        <div className="text-[color:var(--color-text-tertiary)] text-2xl tracking-widest mb-[var(--space-4)]">· · ·</div>
        <h2 className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] leading-[var(--leading-tight)] max-w-[24ch]">
          {getTheirsSoloCopy()}
        </h2>
        <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-[color:var(--color-text-secondary)]">
          Once they&apos;re in, their stuff shows up right here.
        </p>
        <Link
          href="/invite"
          className="mt-[var(--space-4)] text-[length:var(--text-sm)] font-semibold text-[color:var(--color-accent)] hover:underline"
        >
          Bring your person in →
        </Link>
      </motion.div>
    );
  }

  const isFirstRun = variant === "no-tasks";

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.5, ease: [0.25, 1, 0.5, 1] }
      }
      className="flex flex-col items-center justify-center py-[var(--space-16)] px-[var(--space-6)] text-center"
    >
      {/* Illustration placeholder — warm, hand-drawn feel */}
      <div
        className="
          mb-[var(--space-6)]
          h-24 w-24
          rounded-[var(--radius-full)]
          bg-[var(--color-accent-subtle)]
          flex items-center justify-center
        "
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          className="h-12 w-12"
          strokeWidth={1.5}
          stroke="var(--color-accent)"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {isFirstRun ? (
            /* Notebook with pencil — "get it out of your head" */
            <>
              <rect x="10" y="6" width="20" height="28" rx="2" />
              <line x1="14" y1="12" x2="26" y2="12" />
              <line x1="14" y1="17" x2="23" y2="17" />
              <line x1="14" y1="22" x2="20" y2="22" />
              <line x1="30" y1="20" x2="38" y2="12" />
              <line x1="36" y1="10" x2="40" y2="14" />
            </>
          ) : (
            /* Relaxed check / celebration — "all done" */
            <>
              <circle cx="24" cy="24" r="16" />
              <path d="M16 24l5 5 11-11" />
            </>
          )}
        </svg>
      </div>

      {/* Copy */}
      <h2
        className="
          font-[family-name:var(--font-display)]
          text-[length:var(--text-xl)] font-[var(--weight-semibold)]
          text-[color:var(--color-text-primary)]
          leading-[var(--leading-tight)]
          max-w-[20ch]
        "
      >
        {isFirstRun
          ? "Welcome. Let\u2019s get what\u2019s in your head out of there."
          : getCaughtUpCopy()}
      </h2>

      {/* Caught-up summary — recognition moment */}
      {!isFirstRun && completedCount && completedCount > 0 && (
        <motion.p
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.4, ease: [0.25, 1, 0.5, 1], delay: 0.2 }
          }
          className="
            mt-[var(--space-2)]
            font-[family-name:var(--font-display)]
            text-[length:var(--text-base)] text-[color:var(--color-text-secondary)]
            leading-[var(--leading-normal)]
          "
        >
          {getSummaryCopy(completedCount)}
        </motion.p>
      )}

      {/* CTA */}
      {isFirstRun && onAddTask && (
        <button
          onClick={onAddTask}
          className="
            mt-[var(--space-6)]
            inline-flex items-center gap-[var(--space-2)]
            px-[var(--space-6)] py-[var(--space-3)]
            rounded-[var(--radius-full)]
            bg-[var(--color-accent)] text-[color:var(--color-accent-text)]
            text-[length:var(--text-base)] font-[var(--weight-semibold)]
            hover:bg-[var(--color-accent-hover)]
            active:scale-[0.98]
            transition-all duration-[var(--duration-instant)]
            min-h-[var(--touch-target-min)]
            shadow-[var(--shadow-sm)]
          "
        >
          <Plus size={20} strokeWidth={2.5} aria-hidden="true" />
          Add the first thing
        </button>
      )}
    </motion.div>
  );
}
