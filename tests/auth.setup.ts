import {
  clerk,
  clerkSetup,
  setupClerkTestingToken,
} from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import { E2E_USER } from "./fixtures/test-user";
import { resetE2EData } from "./fixtures/reset-db";

const AUTH_FILE = "tests/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await clerkSetup();
  await resetE2EData();

  // Register the FAPI route interceptor BEFORE navigation so the testing
  // token is injected from the very first Clerk request on the page.
  await setupClerkTestingToken({ page });

  await page.goto("/sign-in");
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier: E2E_USER.email,
      password: E2E_USER.password,
    },
  });

  await page.goto("/");
  await page.waitForURL("/");
  await page.context().storageState({ path: AUTH_FILE });
});
