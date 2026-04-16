import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import { E2E_PARTNER } from "./fixtures/partner-user";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env.test", override: true });

const AUTH_FILE = "tests/.auth/partner.json";

/**
 * Sign the E2E partner in and save storageState. Also nukes any residual
 * household for the partner so tests start from a clean "solo partner"
 * state (so accept-flow tests exercise the merge path deterministically).
 */
setup("authenticate partner", async ({ page }) => {
  await clerkSetup();

  const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
  await sql`DELETE FROM households WHERE id IN (
    SELECT household_id FROM users WHERE clerk_user_id = ${E2E_PARTNER.id}
  )`;
  await sql`UPDATE users SET household_id = NULL WHERE clerk_user_id = ${E2E_PARTNER.id}`;

  await setupClerkTestingToken({ page });
  await page.goto("/sign-in");

  await page.waitForFunction(
    () => {
      const w = window as unknown as { Clerk?: { loaded?: boolean } };
      return w.Clerk?.loaded === true;
    },
    { timeout: 15000 },
  );

  // Same sign-in flow as tests/auth.setup.ts (copied, not imported, to keep
  // the setup scripts independent in case one diverges).
  const signInResult = await page.evaluate(
    async ({ identifier, password }) => {
      interface ClerkGlobal {
        client?: {
          signIn: {
            create: (p: unknown) => Promise<{
              status: string;
              createdSessionId?: string;
              supportedSecondFactors?: Array<{
                strategy: string;
                emailAddressId?: string;
              }>;
              prepareSecondFactor: (p: {
                strategy: string;
                emailAddressId?: string;
              }) => Promise<unknown>;
              attemptSecondFactor: (p: {
                strategy: string;
                code: string;
              }) => Promise<{
                status: string;
                createdSessionId?: string;
              }>;
            }>;
          };
        };
        setActive: (p: { session: string }) => Promise<void>;
      }
      const clerk = (window as unknown as { Clerk?: ClerkGlobal }).Clerk;
      if (!clerk?.client) return { error: "no clerk" };
      const signIn = await clerk.client.signIn.create({
        strategy: "password",
        identifier,
        password,
      });
      if (signIn.status === "complete" && signIn.createdSessionId) {
        await clerk.setActive({ session: signIn.createdSessionId });
        return { status: "complete" };
      }
      if (signIn.status === "needs_second_factor") {
        const email = signIn.supportedSecondFactors?.find(
          (f) => f.strategy === "email_code",
        );
        if (!email) return { status: signIn.status };
        await signIn.prepareSecondFactor({
          strategy: "email_code",
          emailAddressId: email.emailAddressId,
        });
        const verified = await signIn.attemptSecondFactor({
          strategy: "email_code",
          code: "424242",
        });
        if (verified.status === "complete" && verified.createdSessionId) {
          await clerk.setActive({ session: verified.createdSessionId });
          return { status: "complete" };
        }
      }
      return { status: signIn.status };
    },
    { identifier: E2E_PARTNER.email, password: E2E_PARTNER.password },
  );

  if ((signInResult as { status?: string }).status !== "complete") {
    throw new Error(
      `Partner sign-in did not complete: ${JSON.stringify(signInResult)}`,
    );
  }

  await page.goto("/today");
  await page.waitForURL("/today");
  await page.context().storageState({ path: AUTH_FILE });
});
