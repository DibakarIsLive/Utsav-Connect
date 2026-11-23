import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100";

test.describe("administrator security audit", () => {
  test.beforeEach(async ({ context }) => {
    const octet = () => Math.floor(Math.random() * 254) + 1;
    await context.setExtraHTTPHeaders({
      "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}`,
    });
  });

  async function signIn(page, email) {
    await page.goto(`${BASE}/apply?mode=login`);
    await page.getByRole("tab", { name: /Sign in/ }).click();
    await page.getByLabel(/Email address/).fill(email);
    await page.getByLabel(/Password/).fill("UtsavTest!2345");
    await page.getByRole("button", { name: /Sign in/ }).click();
    await expect(page).toHaveURL(`${BASE}/admin`);
  }

  test("an ordinary administrator cannot open protected sections by direct navigation", async ({
    page,
  }) => {
    await signIn(page, "limited@utsav.test");
    for (const path of ["/admin/users", "/admin/audit", "/admin/analytics", "/admin/proposals"]) {
      await page.goto(`${BASE}${path}`);
      await expect(page.getByText("Your account cannot open this section")).toBeVisible();
    }
  });

  test("the Create account form cannot create a Super Admin", async ({ page }) => {
    await signIn(page, "super@utsav.test");
    await page.goto(`${BASE}/admin/users`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const roleOptions = await page.locator("#role option").allTextContents();
    expect(roleOptions).not.toContain("Super Admin");
    expect(roleOptions).toContain("Administrator");
    expect(roleOptions).toContain("Devotee");
  });

  test("permanent deletion actions are unavailable while policy is unapproved", async ({
    page,
  }) => {
    await signIn(page, "super@utsav.test");
    await page.goto(`${BASE}/admin/users`);
    await expect(page.getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);

    await page.goto(`${BASE}/admin/devotees`);
    await expect(page.getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);

    const status = await page.evaluate(async () => {
      const list = await (await fetch("/api/admin/accounts?limit=1")).json();
      const id = list?.data?.accounts?.[0]?.id;
      if (!id) return 404;
      return fetch(`/api/admin/accounts/${id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Policy check" }),
      }).then((response) => response.status);
    });
    expect(status).toBe(410);
  });

  test("an invalid invitation token is rejected with a clear message", async ({ page }) => {
    await page.goto(`${BASE}/accept-invitation?token=definitely-not-a-valid-token`);
    await page.locator("#inviteFullName").fill("Invitation Tester");
    await page.locator("#invitePassword").fill("InvitationTest!2345");
    await page.locator("#invitePhone").fill("+919876543299");
    await page.locator("#inviteGender").selectOption("male");
    await page.getByRole("button", { name: "Accept invitation" }).click();
    await expect(page.getByText(/invalid, already used, or has expired/i)).toBeVisible({
      timeout: 10000,
    });
  });
});
