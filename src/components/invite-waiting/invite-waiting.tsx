"use client";

import { useState } from "react";
import { useCancelInvite } from "@/lib/hooks/use-invite";
import type { Invite } from "@/db/schema";

export interface InviteWaitingProps {
  invite: Invite;
  onCancelled?: () => void;
}

/**
 * InviteWaiting — the "waiting on [partner]" state. Shows the current
 * invite link, a copy button, a resend hint, and a cancel action.
 *
 * Resend of an emailed invite is intentionally NOT supported in v1 —
 * the spec allows it but it's noise for the first ship. The user can
 * cancel and re-create if they need to re-send.
 */
export function InviteWaiting({ invite, onCancelled }: InviteWaitingProps) {
  const cancelInvite = useCancelInvite();
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/${invite.token}`
      : `/invite/${invite.token}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  }

  return (
    <section className="flex flex-col gap-[var(--space-4)]">
      <p className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] text-[color:var(--color-text-primary)]">
        {invite.email
          ? `Waiting on ${invite.email}. You'll know when they're in.`
          : "Your invite link is ready. Send it to your person."}
      </p>

      <div className="flex gap-[var(--space-2)]">
        <input
          readOnly
          value={url}
          aria-label="Invite link"
          className="
            flex-1 px-[var(--space-3)] py-[var(--space-2)]
            rounded-[var(--radius-md)]
            bg-[var(--color-surface-dim)]
            border border-[color:var(--color-border)]
            text-[length:var(--text-sm)] text-[color:var(--color-text-secondary)]
          "
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={handleCopy}
          className="
            px-[var(--space-3)] py-[var(--space-2)]
            rounded-[var(--radius-md)]
            bg-[var(--color-accent)] text-[color:var(--color-accent-text)]
            font-[var(--weight-semibold)]
            min-h-[var(--touch-target-min)]
          "
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <button
        type="button"
        onClick={() =>
          cancelInvite.mutate(invite.id, {
            onSuccess: () => onCancelled?.(),
          })
        }
        disabled={cancelInvite.isPending}
        className="
          self-start text-[length:var(--text-sm)]
          text-[color:var(--color-text-secondary)] underline
          disabled:opacity-50
        "
      >
        {cancelInvite.isPending ? "Cancelling…" : "Cancel and start over"}
      </button>
    </section>
  );
}
