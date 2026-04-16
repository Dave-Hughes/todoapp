"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useCreateInvite } from "@/lib/hooks/use-invite";

export interface InviteComposeProps {
  onSent?: () => void;
}

/**
 * InviteCompose — Organizer's compose screen.
 *
 * Email field primary, copy-link fallback secondary. Self-email blocked
 * client-side against the Clerk-provided email. On success, calls `onSent`
 * so the parent can swap to the waiting state. See specs/multiplayer.md
 * "Invite flow — Mechanics".
 */
export function InviteCompose({ onSent }: InviteComposeProps) {
  const { user } = useUser();
  const selfEmail =
    user?.primaryEmailAddress?.emailAddress.toLowerCase() ?? "";

  const [email, setEmail] = useState("");
  const [linkOnly, setLinkOnly] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const createInvite = useCreateInvite();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setClientError(null);
    const trimmed = email.trim();
    if (!linkOnly) {
      if (!trimmed) {
        setClientError("Enter an email or copy the link instead.");
        return;
      }
      if (trimmed.toLowerCase() === selfEmail) {
        setClientError("That's you.");
        return;
      }
    }
    createInvite.mutate(linkOnly ? null : trimmed, {
      onSuccess: () => onSent?.(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-4)]">
      <div className="flex flex-col gap-[var(--space-2)]">
        <label
          htmlFor="invite-email"
          className="text-[length:var(--text-sm)] font-[var(--weight-semibold)] text-[color:var(--color-text-primary)]"
        >
          Your partner's email
        </label>
        <input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setLinkOnly(false);
          }}
          placeholder="partner@example.com"
          className="
            px-[var(--space-3)] py-[var(--space-2)]
            rounded-[var(--radius-md)]
            bg-[var(--color-surface)]
            border border-[color:var(--color-border)]
            text-[length:var(--text-md)] text-[color:var(--color-text-primary)]
            min-h-[var(--touch-target-min)]
          "
          autoComplete="off"
        />
        {clientError ? (
          <p
            role="alert"
            className="text-[length:var(--text-sm)] text-[color:var(--color-danger)]"
          >
            {clientError}
          </p>
        ) : null}
        {createInvite.isError ? (
          <p
            role="alert"
            className="text-[length:var(--text-sm)] text-[color:var(--color-danger)]"
          >
            Couldn't send. {(createInvite.error as Error).message}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={createInvite.isPending}
        className="
          inline-flex items-center justify-center
          px-[var(--space-4)] py-[var(--space-2)]
          rounded-[var(--radius-md)]
          bg-[var(--color-accent)] text-[color:var(--color-accent-text)]
          font-[var(--weight-semibold)]
          min-h-[var(--touch-target-min)]
          disabled:opacity-50
        "
      >
        {createInvite.isPending ? "Sending…" : "Send invite"}
      </button>

      <button
        type="button"
        onClick={() => {
          setLinkOnly(true);
          setEmail("");
          setClientError(null);
          createInvite.mutate(null, { onSuccess: () => onSent?.() });
        }}
        className="
          self-start text-[length:var(--text-sm)]
          text-[color:var(--color-text-secondary)]
          underline
        "
      >
        Copy link instead
      </button>
    </form>
  );
}
