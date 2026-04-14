import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-[color:var(--color-bg)]">
      <SignIn />
    </div>
  );
}
