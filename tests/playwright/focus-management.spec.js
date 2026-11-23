import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100";

/** Regression coverage for the shared Modal focus lifecycle and form inputs. */
test.describe("focus management", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    // Isolate login rate-limit buckets per test; never change app security.
    await page.setExtraHTTPHeaders({
      "x-forwarded-for": `10.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.__focusErrors = errors;
  });

  async function signInAsAdmin(page, email = "super@utsav.test") {
    await page.goto(`${BASE}/apply?mode=login`);
    await page.getByRole("tab", { name: /Sign in/ }).click();
    await page.getByLabel(/Email address/).fill(email);
    await page.getByLabel(/Password/).fill("UtsavTest!2345");
    await page.getByRole("button", { name: /Sign in/ }).click();
    await expect(page).toHaveURL(`${BASE}/admin`);
  }

  test("Create Account modal keeps focus in Full Name while typing and restores it on close", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await page.goto(`${BASE}/admin/users`);
    const trigger = page.getByRole("button", { name: "Create account" });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const fullName = page.locator("#fullName");
    await expect(fullName).toBeFocused();
    for (const char of "Ananya") {
      await page.keyboard.type(char);
      await expect(fullName).toBeFocused();
    }
    await expect(fullName).toHaveValue("Ananya");
    await page.keyboard.press("Backspace");
    await expect(fullName).toBeFocused();
    await expect(fullName).toHaveValue("Anany");

    await page.locator("#email").fill("focus-test@example.com");
    await expect(page.locator("#email")).toBeFocused();
    await page.locator("#phone").fill("9876543210");
    await expect(page.locator("#phone")).toBeFocused();
    await page.locator("#password").fill("FocusTestPassword!2345");
    await expect(page.locator("#password")).toBeFocused();

    const show = page.getByRole("button", { name: "Show" });
    if (await show.count()) {
      await show.click();
      await expect(page.locator("#password")).toHaveValue("FocusTestPassword!2345");
      await expect(page.getByRole("button", { name: "Hide" })).toBeVisible();
    }
    const generate = page.getByRole("button", { name: "Generate" });
    await generate.click();
    const generated = await page.locator("#password").inputValue();
    expect(generated.length).toBeGreaterThanOrEqual(12);

    await page.locator("#gender").focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("#gender")).toBeFocused();

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(page.__focusErrors).toEqual([]);
  });

  test("Escape closes the modal and restores the trigger focus", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto(`${BASE}/admin/users`);
    const trigger = page.getByRole("button", { name: "Create account" });
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("Area creation and invitation review modals keep input focus while typing", async ({
    page,
  }) => {
    await signInAsAdmin(page);

    await page.goto(`${BASE}/admin/areas`);
    const areaTrigger = page.getByRole("button", { name: "Create area" });
    await areaTrigger.click();
    const areaName = page.locator("#areaName");
    await expect(areaName).toBeFocused();
    await page.keyboard.type("Focus area");
    await expect(areaName).toBeFocused();
    await expect(areaName).toHaveValue("Focus area");
    await page.keyboard.press("Escape");

    await page.goto(`${BASE}/admin/invitations`);
    const review = page.getByRole("button", { name: /Review/ }).first();
    if (await review.count()) {
      await review.click();
      const notes = page.locator("#reportReviewNotes");
      if (await notes.count()) {
        await notes.click();
        await page.keyboard.type("Checked during focus regression");
        await expect(notes).toBeFocused();
        await expect(notes).toHaveValue("Checked during focus regression");
      }
      await page.keyboard.press("Escape");
    }
    expect(page.__focusErrors).toEqual([]);
  });

  test("Public registration inputs keep focus while typing", async ({ page }) => {
    await page.goto(`${BASE}/apply`);
    const fullName = page.locator("#fullName");
    await fullName.click();
    await page.keyboard.type("Focus Visitor");
    await expect(fullName).toBeFocused();
    await page.locator("#password").fill("RegistrationPassword!2345");
    await expect(page.locator("#password")).toBeFocused();
    await page.locator("#phone").focus();
    await page.keyboard.type("9876543210");
    await expect(page.locator("#phone")).toBeFocused();
    await expect(page.locator("#phone")).toHaveValue("9876543210");
    expect(page.__focusErrors).toEqual([]);
  });

  test("Create Account modal on mobile keeps focus while typing", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInAsAdmin(page);
    await page.goto(`${BASE}/admin/users`);
    await page.getByRole("button", { name: "Create account" }).click();
    const fullName = page.locator("#fullName");
    await expect(fullName).toBeFocused();
    await page.keyboard.type("Mobile User");
    await expect(fullName).toBeFocused();
    await expect(fullName).toHaveValue("Mobile User");
  });
});

test.describe("focus management — validation targets", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.setExtraHTTPHeaders({
      "x-forwarded-for": `10.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`,
    });
  });

  test("empty area form focuses the named field, not a missing id", async ({ page }) => {
    await page.goto(`${BASE}/apply?mode=login`);
    await page.getByRole("tab", { name: /Sign in/ }).click();
    await page.getByLabel(/Email address/).fill("super@utsav.test");
    await page.getByLabel(/Password/).fill("UtsavTest!2345");
    await page.getByRole("button", { name: /Sign in/ }).click();
    await expect(page).toHaveURL(`${BASE}/admin`);
    await page.goto(`${BASE}/admin/areas`);
    await page.getByRole("button", { name: "Create area" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /Create approved area|Save changes/ })
      .click();
    await expect(page.locator("#areaName")).toBeFocused();
  });

  test("login validation focuses the login email field", async ({ page }) => {
    await page.goto(`${BASE}/apply?mode=login`);
    await page.getByLabel(/Email address/).fill("not-an-email");
    await page.getByLabel(/Password/).fill("x");
    await page.getByRole("button", { name: /Sign in/ }).click();
    await expect(page.locator("#loginEmail")).toBeFocused();
  });
});
