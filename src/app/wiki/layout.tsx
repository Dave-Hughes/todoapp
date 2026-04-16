import { redirect } from "next/navigation";
import { AuthError, getAuthedContext } from "@/lib/auth-context";
import { WikiAppFrame } from "@/components/wiki-app-frame/wiki-app-frame";

/**
 * /wiki layout
 * ============
 * Server component. Gates the entire /wiki tree behind authentication and
 * wraps children in the shared app chrome (Sidebar, MobileHeader, BottomTabs).
 *
 * Auth failure → redirect to /sign-in. Matches the rest of the app's pattern.
 */

export default async function WikiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await getAuthedContext();
  } catch (e) {
    if (e instanceof AuthError) {
      redirect("/sign-in");
    }
    throw e;
  }

  return <WikiAppFrame activePath="/wiki">{children}</WikiAppFrame>;
}
