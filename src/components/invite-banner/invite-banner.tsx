"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { UserPlus, X } from "lucide-react";
import { EASE_OUT_QUART } from "../../lib/motion";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const STORAGE_KEY = "todoapp:invite-banner-dismissed";

export interface InviteBannerProps {
  /** When true, render nothing (use this for the paired-state hide). */
  hidden?: boolean;
}

/**
 * InviteBanner
 *
 * A content-wide, dismissable banner that nudges a solo user to bring their
 * partner in. Sits above the page header inside the main canvas. Persists
 * dismissal in localStorage so it doesn't reappear on every page load.
 *
 * The persistent affordance lives elsewhere — sidebar (desktop) and mobile
 * header (mobile). Dismissing this banner only hides the banner itself.
 */
export function InviteBanner({ hidden = false }: InviteBannerProps) {
  const shouldReduceMotion = useReducedMotion();
  // Start hidden so SSR and the first client render agree (no flash). The
  // localStorage check runs in an effect after mount.
  const [isDismissed, setIsDismissed] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  useIsoLayoutEffect(() => {
    setHasMounted(true);
    try {
      setIsDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setIsDismissed(false);
    }
  }, []);

  function handleDismiss() {
    setIsDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* noop — banner stays hidden for this session even if storage failed */
    }
  }

  const visible = hasMounted && !hidden && !isDismissed;

  if (!visible) return null;

  return (
    <motion.aside
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
      aria-label="Invite your partner"
      className="
        relative mb-[var(--space-4)]
        flex items-center gap-[var(--space-3)]
        px-[var(--space-4)] py-[var(--space-2)]
        rounded-[var(--radius-lg)]
        bg-[var(--color-accent-subtle)]
        shadow-[var(--shadow-sm)]
      "
    >
      <div className="flex-1 min-w-0">
        <p className="inline-flex items-center gap-[var(--space-2)] font-[family-name:var(--font-display)] text-[length:var(--text-sm)] font-[var(--weight-semibold)] text-[color:var(--color-text-primary)] leading-[var(--leading-tight)]">
          <UserPlus
            size={14}
            strokeWidth={2.25}
            aria-hidden="true"
            className="text-[color:var(--color-accent)] shrink-0"
          />
          {/* nbsp keeps "person in." together so "in." doesn't orphan on narrow viewports */}
          Bring your person&nbsp;in.
        </p>
        <p className="text-[length:var(--text-xs)] text-[color:var(--color-text-secondary)] mt-[var(--space-0-5)]">
          Two heads, one list. That&rsquo;s the whole point.
        </p>
      </div>

      <a
        href="/invite"
        className="
          shrink-0 inline-flex items-center
          px-[var(--space-3)] py-[var(--space-1-5)]
          rounded-[var(--radius-md)]
          text-[length:var(--text-sm)] font-[var(--weight-semibold)]
          text-[color:var(--color-accent-hover)]
          hover:bg-[var(--color-accent)] hover:text-[color:var(--color-accent-text)]
          hover:-translate-y-px hover:shadow-[var(--shadow-sm)]
          active:translate-y-0 active:shadow-none
          transition-[color,background-color,transform,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out-quart)]
          min-h-[var(--touch-target-min)]
        "
      >
        Send invite
      </a>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss invite banner"
        className="
          shrink-0 inline-flex items-center justify-center
          h-[var(--touch-target-min)] w-[var(--touch-target-min)]
          -mr-[var(--space-2)]
          rounded-[var(--radius-sm)]
          text-[color:var(--color-text-tertiary)]
          hover:text-[color:var(--color-text-primary)]
          hover:bg-[var(--color-canvas)]
          transition-colors duration-[var(--duration-instant)]
        "
      >
        <X size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </motion.aside>
  );
}
