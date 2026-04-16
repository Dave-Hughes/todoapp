"use client";

import Link from "next/link";
import { useCurrentInvite } from "@/lib/hooks/use-invite";
import { InviteCompose } from "@/components/invite-compose/invite-compose";
import { InviteWaiting } from "@/components/invite-waiting/invite-waiting";

export default function InvitePage() {
  const { data, isLoading } = useCurrentInvite();

  return (
    <main
      className="
        min-h-dvh
        bg-[color:var(--color-bg)]
        text-[color:var(--color-text-primary)]
        py-[var(--space-8)] px-[var(--space-4)]
      "
    >
      <div className="max-w-[480px] mx-auto flex flex-col gap-[var(--space-6)]">
        <header className="flex flex-col gap-[var(--space-1)]">
          <Link
            href="/today"
            className="
              text-[length:var(--text-sm)] text-[color:var(--color-text-secondary)]
              underline self-start
            "
          >
            ← Back
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-2xl)] font-[var(--weight-bold)]">
            Bring your person in.
          </h1>
          <p className="text-[length:var(--text-md)] text-[color:var(--color-text-secondary)]">
            Two heads, one list. That's the whole point.
          </p>
        </header>

        {isLoading ? (
          <p className="text-[color:var(--color-text-secondary)]">Loading…</p>
        ) : data?.invite ? (
          <InviteWaiting invite={data.invite} />
        ) : (
          <InviteCompose />
        )}
      </div>
    </main>
  );
}
