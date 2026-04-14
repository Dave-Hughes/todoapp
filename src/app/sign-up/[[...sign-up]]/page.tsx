import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-[color:var(--color-bg)]">
      <SignUp />
    </div>
  );
}
