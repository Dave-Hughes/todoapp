import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getAuthedContext } from "@/lib/auth-context";
import { acceptInvite } from "@/lib/invites/accept";

export const dynamic = "force-dynamic";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    // Bounce back through Clerk with return path.
    const returnTo = `/invite/${token}/accept`;
    redirect(`/sign-in?redirect_url=${encodeURIComponent(returnTo)}`);
  }

  // Ensure an app-side user row exists before we try to redeem.
  const { user } = await getAuthedContext();
  const result = await acceptInvite({ token, acceptingUserId: user.id });

  if (result.kind === "ok") {
    redirect("/today?welcomed=1");
  }

  const message =
    result.kind === "invalid_token"
      ? "This invite is no longer valid. Ask your partner to send a new one."
      : result.kind === "self_invite"
        ? "You're already in this household."
        : result.kind === "household_full"
          ? "That household is full already."
          : "You're already in a household. You'd need to leave it first.";

  return (
    <main className="min-h-dvh flex items-center justify-center p-8 bg-[color:var(--color-bg)]">
      <p className="text-[color:var(--color-text-secondary)] max-w-[360px] text-center">
        {message}
      </p>
    </main>
  );
}
