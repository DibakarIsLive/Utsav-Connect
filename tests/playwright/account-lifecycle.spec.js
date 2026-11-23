import { test, expect } from "@playwright/test";
// Mirrors api/lib/policies/account-deletion-policy.js; Playwright cannot import
// server-only modules. Update both together when the policy is approved.
const ACCOUNT_DELETION_POLICY_APPROVED = false;
const deletionTest = ACCOUNT_DELETION_POLICY_APPROVED ? test : test.skip;

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100";

test.describe("account lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.setExtraHTTPHeaders({
      "x-forwarded-for": `10.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`,
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

  async function createTempAccount(page, role) {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fullName = `Delete ${role} ${stamp}`;
    const email = `deletetest-${stamp}@example.com`;
    const result = await page.evaluate(
      async (payload) => {
        const response = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await response.json().catch(() => null);
        return { status: response.status, id: body?.data?.user?._id ?? body?.data?.user?.id };
      },
      {
        fullName,
        email,
        password: "TempDelete!2345",
        phone: "+919876543210",
        gender: "male",
        role,
        adminPermissions: role === "admin" ? ["application:read:all"] : [],
      },
    );
    expect(result.status).toBe(201);
    return { fullName, id: result.id };
  }

  async function deleteFromRow(page, rowText, noticeText) {
    const row = page.locator("tr:visible, li:visible").filter({ hasText: rowText }).first();
    await row.getByRole("button", { name: "Delete" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(rowText);
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator("tr:visible, li:visible").filter({ hasText: rowText })).toHaveCount(
      1,
    );

    await row.getByRole("button", { name: "Delete" }).click();
    await page.locator("#deleteReason").fill("Automated acceptance cleanup of temporary account");
    await page.locator("#deleteConfirm").check();
    await page.getByRole("dialog").getByRole("button", { name: "Delete account" }).click();
    await expect(page.getByText(noticeText)).toBeVisible();
    await expect(page.locator("tr:visible, li:visible").filter({ hasText: rowText })).toHaveCount(
      0,
    );
  }

  deletionTest(
    "Super Admin deletes an administrator with confirmation and cancellation",
    async ({ page }) => {
      await signIn(page, "super@utsav.test");
      const { fullName } = await createTempAccount(page, "admin");
      await page.goto(`${BASE}/admin/users`);
      await deleteFromRow(page, fullName, "was permanently deleted");
    },
  );

  deletionTest("Devotee Management deletes a devotee with confirmation", async ({ page }) => {
    await signIn(page, "super@utsav.test");
    const { fullName } = await createTempAccount(page, "devotee");
    await page.goto(`${BASE}/admin/devotees`);
    await deleteFromRow(page, fullName, "was permanently deleted");
  });

  deletionTest(
    "API refuses unauthorized, self and Super Admin deletion attempts",
    async ({ page, browser }) => {
      await signIn(page, "super@utsav.test");
      const accounts = await page.evaluate(async () => {
        const response = await fetch("/api/admin/accounts?search=Lifecycle+Fixture");
        return response.json();
      });
      const targetId = accounts?.data?.accounts?.[0]?.id;
      expect(targetId).toBeTruthy();
      const me = await page.evaluate(async () => (await fetch("/api/auth/me")).json());
      const myId = me?.data?.user?._id;
      expect(myId).toBeTruthy();

      const selfStatus = await page.evaluate(
        (id) =>
          fetch(`/api/admin/accounts/${id}`, {
            method: "DELETE",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ reason: "Attempting self deletion" }),
          }).then((r) => r.status),
        myId,
      );
      expect(selfStatus).toBe(403);

      const limited = await browser.newContext();
      const limitedPage = await limited.newPage();
      await limitedPage.setExtraHTTPHeaders({
        "x-forwarded-for": `10.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`,
      });
      await signIn(limitedPage, "limited@utsav.test");
      const limitedStatus = await limitedPage.evaluate(
        (id) =>
          fetch(`/api/admin/accounts/${id}`, {
            method: "DELETE",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ reason: "Unauthorized deletion attempt" }),
          }).then((r) => r.status),
        targetId,
      );
      expect(limitedStatus).toBe(403);
      await limited.close();
    },
  );

  test("devotee:status:update allows suspension but not deletion", async ({ page, browser }) => {
    await signIn(page, "super@utsav.test");
    const { id } = await createTempAccount(page, "devotee");
    expect(id).toBeTruthy();

    const context = await browser.newContext();
    const statusPage = await context.newPage();
    await statusPage.setExtraHTTPHeaders({
      "x-forwarded-for": `10.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`,
    });
    await signIn(statusPage, "status-only@utsav.test");
    const reason = "Automated suspension regression check";
    const suspendStatus = await statusPage.evaluate(
      ({ targetId, reason }) =>
        fetch(`/api/admin/accounts/${targetId}/status`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "suspended", reason }),
        }).then((r) => r.status),
      { targetId: id, reason },
    );
    expect(suspendStatus).toBe(200);
    const deleteStatus = await statusPage.evaluate(
      (targetId) =>
        fetch(`/api/admin/accounts/${targetId}`, {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: "Unauthorised deletion attempt" }),
        }).then((r) => r.status),
      id,
    );
    expect(deleteStatus).toBe(410);
    await context.close();
  });

  test("devotee detail actions follow the current account status", async ({ page }) => {
    await signIn(page, "super@utsav.test");
    const { id, fullName } = await createTempAccount(page, "devotee");
    await page.goto(`${BASE}/admin/devotees/${id}`);
    await expect(page.getByRole("heading", { name: fullName })).toBeVisible();

    // Active account: suspend is offered and reinstate is hidden. Permanent
    // deletion is not exposed anywhere while the retention policy is unapproved.
    await expect(page.getByRole("button", { name: "Suspend devotee" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reinstate devotee" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete devotee account" })).toHaveCount(0);

    // Suspend through the real UI and confirm reinstatement becomes discoverable
    // while suspend disappears — the status-dependent action requirement.
    await page.locator("#statusReason").fill("UI verification suspension");
    await page.getByRole("button", { name: "Suspend devotee" }).click();
    await expect(page.getByRole("button", { name: "Reinstate devotee" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Suspend devotee" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete devotee account" })).toHaveCount(0);
  });

  deletionTest("deletion reason is required by the API", async ({ page }) => {
    await signIn(page, "super@utsav.test");
    const status = await page.evaluate(async () => {
      const list = await (await fetch("/api/admin/accounts?search=Lifecycle+Fixture")).json();
      const id = list?.data?.accounts?.[0]?.id;
      if (!id) return 404;
      return fetch(`/api/admin/accounts/${id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: "{}",
      }).then((r) => r.status);
    });
    expect(status).toBe(400);
  });
});
