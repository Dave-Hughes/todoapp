"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { X } from "lucide-react";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface Props {
  inviteId: string;
  hasEmail: boolean;
  inviteUrl: string;
  onResent?: () => void;
}

function keyFor(id: string) {
  return `reengage-dismissed-${id}`;
}

export function ReengageBanner({ inviteId, hasEmail, inviteUrl, onResent }: Props) {
  const [hidden, setHidden] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [busy, setBusy] = useState(false);

  useIsoLayoutEffect(() => {
    setHasMounted(true);
    try {
      setHidden(window.localStorage.getItem(keyFor(inviteId)) === "1");
    } catch {
      setHidden(false);
    }
  }, [inviteId]);

  function dismiss() {
    try {
      window.localStorage.setItem(keyFor(inviteId), "1");
    } catch {
      /* noop */
    }
    setHidden(true);
  }

  async function handleResend() {
    setBusy(true);
    try {
      if (hasEmail) {
        const res = await fetch(`/api/invites/${inviteId}/resend`, { method: "POST" });
        if (!res.ok) throw new Error("resend_failed");
      } else {
        await navigator.clipboard.writeText(inviteUrl);
      }
      onResent?.();
      dismiss();
    } finally {
      setBusy(false);
    }
  }

  if (!hasMounted || hidden) return null;

  return (
    <div className="relative mb-[var(--space-4)] rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-dim)] p-[var(--space-4)]">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Not now"
        className="absolute top-2 right-2 h-6 w-6 rounded-[var(--radius-md)] text-[color:var(--color-text-tertiary)] hover:bg-[var(--color-surface)] inline-flex items-center justify-center transition-colors duration-[var(--duration-instant)]"
      >
        <X size={14} aria-hidden="true" />
      </button>
      <div className="text-[length:var(--text-sm)] font-[var(--weight-semibold)] text-[color:var(--color-text-primary)]">
        Your person hasn&apos;t joined yet.
      </div>
      <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-[color:var(--color-text-secondary)]">
        Want to send the invite again?
      </p>
      <div className="mt-[var(--space-3)] flex gap-[var(--space-2)]">
        <button
          type="button"
          disabled={busy}
          onClick={handleResend}
          className="rounded-full bg-[var(--color-accent)] text-[color:var(--color-accent-text)] text-[length:var(--text-sm)] font-[var(--weight-semibold)] px-[var(--space-3)] py-[var(--space-1-5)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors duration-[var(--duration-instant)]"
        >
          {hasEmail ? "Re-send invite" : "Copy link again"}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="text-[length:var(--text-sm)] font-[var(--weight-semibold)] text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-secondary)] px-[var(--space-3)] py-[var(--space-1-5)] transition-colors duration-[var(--duration-instant)]"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
