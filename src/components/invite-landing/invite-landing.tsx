import Link from "next/link";

export interface InviteLandingProps {
  organizerName: string;
  token: string;
}

/**
 * The branded landing page the Willing Partner sees when they click the
 * invite link. Presentational only — the parent page resolves the token
 * and handles the three error states.
 *
 * Per specs/multiplayer.md "Invite email/link content":
 * > "[Organizer name] invited you. This is where you two run the house."
 */
export function InviteLanding({ organizerName, token }: InviteLandingProps) {
  // After sign-up/sign-in, Clerk redirects the partner to /invite/[token]/accept
  // where the redemption runs.
  const redirectUrl = `/invite/${token}/accept`;
  return (
    <main
      className="
        min-h-dvh
        bg-[color:var(--color-bg)]
        text-[color:var(--color-text-primary)]
        flex items-center justify-center
        py-[var(--space-8)] px-[var(--space-4)]
      "
    >
      <div className="max-w-[480px] w-full flex flex-col gap-[var(--space-6)] text-center">
        <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-3xl)] font-[var(--weight-bold)] leading-[var(--leading-tight)]">
          {organizerName} invited you.
        </h1>
        <p className="text-[length:var(--text-lg)] text-[color:var(--color-text-secondary)]">
          This is where you two run the house.
        </p>

        <div className="flex flex-col gap-[var(--space-2)]">
          <Link
            href={`/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`}
            className="
              inline-flex items-center justify-center
              px-[var(--space-4)] py-[var(--space-3)]
              rounded-[var(--radius-md)]
              bg-[var(--color-accent)] text-[color:var(--color-accent-text)]
              font-[var(--weight-semibold)]
              min-h-[var(--touch-target-min)]
            "
          >
            Sign up to join
          </Link>
          <Link
            href={`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`}
            className="
              text-[length:var(--text-sm)] text-[color:var(--color-text-secondary)]
              underline
            "
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
