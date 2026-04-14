import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import { E2E_USER } from "./fixtures/test-user";
import { resetE2EData } from "./fixtures/reset-db";

const AUTH_FILE = "tests/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await clerkSetup();
  await resetE2EData();

  // Inject Clerk testing token so FAPI requests bypass rate limits.
  await setupClerkTestingToken({ page });

  await page.goto("/sign-in");

  // Wait for Clerk to finish loading before driving sign-in.
  await page.waitForFunction(
    () => {
      const w = window as unknown as { Clerk?: { loaded?: boolean } };
      return w.Clerk?.loaded === true;
    },
    { timeout: 15000 },
  );

  // This Clerk dev instance requires email_code as a second factor even
  // though the instance's MFA toggles are off. For `+clerk_test@example.com`
  // addresses Clerk accepts the magic code "424242" without sending email.
  const signInResult = await page.evaluate(
    async ({ identifier, password }) => {
      interface EmailCodeFactor {
        strategy: "email_code";
        emailAddressId?: string;
      }
      interface SignInResource {
        status: string;
        createdSessionId?: string;
        supportedSecondFactors?: Array<{ strategy: string; emailAddressId?: string }>;
        prepareSecondFactor: (params: { strategy: string; emailAddressId?: string }) => Promise<unknown>;
        attemptSecondFactor: (params: { strategy: string; code: string }) => Promise<SignInResource>;
      }
      interface ClerkGlobal {
        client?: { signIn: { create: (params: unknown) => Promise<SignInResource> } };
        setActive: (params: { session: string }) => Promise<void>;
      }
      const clerk = (window as unknown as { Clerk?: ClerkGlobal }).Clerk;
      if (!clerk?.client) return { error: "clerk.client not ready" };

      try {
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
          const emailFactor = signIn.supportedSecondFactors?.find(
            (f): f is EmailCodeFactor => f.strategy === "email_code",
          );
          if (!emailFactor) {
            return { status: signIn.status, error: "no email_code factor" };
          }
          await signIn.prepareSecondFactor({
            strategy: "email_code",
            emailAddressId: emailFactor.emailAddressId,
          });
          const verified = await signIn.attemptSecondFactor({
            strategy: "email_code",
            code: "424242",
          });
          if (verified.status === "complete" && verified.createdSessionId) {
            await clerk.setActive({ session: verified.createdSessionId });
            return { status: "complete" };
          }
          return { status: verified.status, stage: "after_second_factor" };
        }

        return {
          status: signIn.status,
          supportedSecondFactors: signIn.supportedSecondFactors?.map(
            (f) => f.strategy,
          ),
        };
      } catch (err) {
        const e = err as {
          errors?: Array<{ code: string; message: string }>;
          message?: string;
        };
        return { errors: e.errors, message: e.message };
      }
    },
    { identifier: E2E_USER.email, password: E2E_USER.password },
  );

  if ((signInResult as { status?: string }).status !== "complete") {
    throw new Error(
      `Sign-in did not complete: ${JSON.stringify(signInResult, null, 2)}`,
    );
  }

  await page.goto("/");
  await page.waitForURL("/");
  await page.context().storageState({ path: AUTH_FILE });
});
