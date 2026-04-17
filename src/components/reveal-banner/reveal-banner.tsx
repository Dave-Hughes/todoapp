"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { scrollToTaskAndHighlight } from "@/lib/ui/scroll-to-task";

interface Props {
  organizerName: string;
  firstAssignedTaskId: string | null;
  preAssignedCount: number;
}

const STORAGE_KEY = "reveal-dismissed";

export function RevealBanner({ organizerName, firstAssignedTaskId, preAssignedCount }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const wantsReveal = params.get("welcomed") === "1";
  const alreadyDismissed =
    mounted && typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "1";

  useEffect(() => {
    if (wantsReveal && mounted) {
      // Strip the query param so reload doesn't re-show.
      router.replace("/today");
    }
  }, [wantsReveal, mounted, router]);

  if (!mounted || !wantsReveal || alreadyDismissed) return null;

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    router.refresh();
  }

  function handleCTA() {
    if (firstAssignedTaskId) scrollToTaskAndHighlight(firstAssignedTaskId);
    dismiss();
  }

  const body =
    preAssignedCount > 0
      ? `${organizerName} already put a few things on your plate.`
      : "Nothing's assigned to you yet. Take a look around.";

  return (
    <div className="relative mb-[var(--space-4)] rounded-[var(--radius-lg)] border border-[var(--color-accent-subtle)] bg-gradient-to-br from-[var(--color-accent-subtle)] to-[var(--color-surface)] p-[var(--space-4)] shadow-[var(--shadow-sm)]">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 h-6 w-6 rounded-[var(--radius-md)] text-[color:var(--color-text-tertiary)] hover:bg-[var(--color-surface-dim)] inline-flex items-center justify-center"
      >
        <X size={14} aria-hidden />
      </button>
      <div className="text-[length:var(--text-xs)] uppercase tracking-wider font-bold text-[color:var(--color-accent)]">
        Welcome
      </div>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-[length:var(--text-lg)] leading-[var(--leading-tight)] font-[var(--weight-semibold)]">
        You&apos;re in. This is everything {organizerName} has been carrying around.
      </h2>
      <p className="mt-[var(--space-1-5)] text-[length:var(--text-sm)] text-[color:var(--color-text-secondary)] leading-[var(--leading-normal)]">
        {body}
      </p>
      {preAssignedCount > 0 && firstAssignedTaskId && (
        <button
          onClick={handleCTA}
          className="mt-[var(--space-3)] inline-flex items-center gap-[var(--space-1)] rounded-full bg-[var(--color-text-primary)] text-[var(--color-surface)] text-[length:var(--text-sm)] font-semibold px-[var(--space-3)] py-[var(--space-1-5)] hover:opacity-90"
        >
          Want to grab one? ↓
        </button>
      )}
    </div>
  );
}
