import { test, expect } from "@playwright/test";

const BREAKPOINTS = {
  desktop: { width: 1366, height: 768 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};

const BASE = "http://localhost:3000";

async function setViewport(page, name) {
  const size = BREAKPOINTS[name];
  await page.setViewportSize(size);
}

async function screenshot(page, name) {
  await page.screenshot({ path: `.local/browser-screenshots/${name}.png`, fullPage: true });
}

test.describe("Utsav-Connect public visitor journey", () => {
  for (const [size] of Object.entries(BREAKPOINTS)) {
    test(`opens homepage on ${size}`, async ({ page }) => {
      await setViewport(page, size);
      await page.goto(`${BASE}/`);
      await expect(page.getByRole("heading", { name: /Every invitation\. Every locality\. One shared map/ })).toBeVisible();
      // Only About in public nav
      await expect(page.getByRole("link", { name: /About/ }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /Apply to join/i }).first()).toBeVisible();
      // No separate Map nav item (check header nav only, not venue buttons)
      await expect(page.locator("header").getByRole("link", { name: /Map/ })).not.toBeVisible();
      // Logo links to /
      await expect(page.locator('header a[aria-label="Utsav-Connect home"]')).toHaveAttribute("href", "/");
      await screenshot(page, `homepage-${size}`);
    });

    test(`venue page shows Kulti Golf Ground on ${size}`, async ({ page }) => {
      await setViewport(page, size);
      await page.goto(`${BASE}/map`);
      await expect(page.getByRole("heading", { name: /Find the official venue/ })).toBeVisible();
      await expect(page.getByText(/Kulti Golf Ground/).first()).toBeVisible();
      await screenshot(page, `venue-${size}`);
    });

    test(`about page on ${size}`, async ({ page }) => {
      await setViewport(page, size);
      await page.goto(`${BASE}/about`);
      await expect(page.getByRole("heading", { name: /A shared map, held together by trust/ })).toBeVisible();
      await screenshot(page, `about-${size}`);
    });

    test(`apply page default tab is Apply on ${size}`, async ({ page }) => {
      await setViewport(page, size);
      await page.goto(`${BASE}/apply`);
      await expect(page.getByRole("tab", { name: /Apply to join/i })).toBeVisible();
      await expect(page.getByRole("tab", { name: /Sign in/ })).toBeVisible();
      await expect(page.getByRole("tab", { name: /Apply to join/i })).toHaveAttribute("aria-selected", "true");
      await expect(page.getByLabel(/Full name/)).toBeVisible();
      await expect(page.getByLabel(/Email address/)).toBeVisible();
      await expect(page.getByLabel(/Password/)).toBeVisible();
      await expect(page.getByLabel(/Phone number/)).toBeVisible();
      await expect(page.getByLabel(/Gender/)).toBeVisible();
      await expect(page.getByLabel(/Message or background/)).toBeVisible();
      await screenshot(page, `apply-${size}`);
    });
  }
});

test.describe("authentication flows", () => {
  test("/login redirects to /apply?mode=login", async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop);
    await page.goto(`${BASE}/login`);
    await expect(page).toHaveURL(`${BASE}/apply?mode=login`);
    await expect(page.getByRole("tab", { name: /Sign in/ })).toBeVisible();
    await screenshot(page, "login-redirect-desktop");
  });

  test("sign in tab exists on /apply with mode=login", async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop);
    await page.goto(`${BASE}/apply?mode=login`);
    await expect(page.getByRole("tab", { name: /Sign in/ })).toHaveAttribute("aria-selected", "true");
  });

  test("sign in and reach dashboard", async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop);
    await page.goto(`${BASE}/apply?mode=login`);
    await page.getByRole("tab", { name: /Sign in/ }).click();
    await page.getByLabel(/Email address/).fill("devotee@utsav.test");
    await page.getByLabel(/Password/).fill("UtsavTest!2345");
    await page.getByRole("button", { name: /Sign in/ }).click();
    // Should redirect to dashboard for active devotee
    await expect(page).toHaveURL(`${BASE}/dashboard`);
    await expect(page.getByRole("heading", { name: /Jai Guru, Suman/ })).toBeVisible();
    await screenshot(page, "signed-in-dashboard-desktop");
  });
});

test.describe("devotee dashboard journey", () => {
  test("active devotee can view dashboard, submit report, view history", async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop);
    await page.goto(`${BASE}/apply?mode=login`);
    await page.getByRole("tab", { name: /Sign in/ }).click();
    await page.getByLabel(/Email address/).fill("devotee@utsav.test");
    await page.getByLabel(/Password/).fill("UtsavTest!2345");
    await page.getByRole("button", { name: /Sign in/ }).click();
    await expect(page).toHaveURL(`${BASE}/dashboard`);

    // Dashboard stats visible
    await expect(page.getByText(/Invitations in public totals/)).toBeVisible();
    await expect(page.getByText(/Reports submitted/)).toBeVisible();
    await expect(page.getByText(/Localities reached/)).toBeVisible();
    await expect(page.getByText(/Proposals shared/)).toBeVisible();

    // Record invitations
    await page.getByRole("button", { name: /Record invitations/ }).click();
    await expect(page.getByRole("heading", { name: /Record invitations/ })).toBeVisible();
    await page.getByRole("radio", { name: /Baidyanath Dham/ }).click();
    await page.getByLabel(/Invitations extended/).fill("50");
    await page.getByLabel(/Date invitations were extended/).fill("2026-10-01");
    await page.getByRole("button", { name: /Submit report/ }).click();
    await expect(page.getByRole("heading", { name: /Report recorded/ })).toBeVisible();
    await screenshot(page, "devotee-report-submitted-desktop");

    // Close the success modal and verify the report appears in history
    await page.keyboard.press("Escape");
    await expect(page.getByText(/Baidyanath Dham/, { exact: false }).first()).toBeVisible();
    await screenshot(page, "devotee-dashboard-with-report-desktop");
  });

  test("pending applicant redirected to application status", async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop);
    await page.goto(`${BASE}/apply?mode=login`);
    await page.getByRole("tab", { name: /Sign in/ }).click();
    await page.getByLabel(/Email address/).fill("applicant@utsav.test");
    await page.getByLabel(/Password/).fill("UtsavTest!2345");
    await page.getByRole("button", { name: /Sign in/ }).click();
    await expect(page).toHaveURL(`${BASE}/application-status`);
    await expect(page.getByRole("heading", { name: /Your application is with the reviewers/ })).toBeVisible();
    await screenshot(page, "application-status-desktop");
  });
});

test.describe("admin journeys", () => {
  test("admin reviews applications, manages areas, reviews proposals", async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop);
    await page.goto(`${BASE}/apply?mode=login`);
    await page.getByRole("tab", { name: /Sign in/ }).click();
    await page.getByLabel(/Email address/).fill("admin@utsav.test");
    await page.getByLabel(/Password/).fill("UtsavTest!2345");
    await page.getByRole("button", { name: /Sign in/ }).click();
    await expect(page).toHaveURL(`${BASE}/admin`);
    await expect(page.getByRole("heading", { name: /Good to see you, and thank you for reviewing/ })).toBeVisible();

    // Applications queue
    await page.getByRole("link", { name: /Applications/ }).click();
    await expect(page.getByRole("heading", { name: /The people behind every application/ })).toBeVisible();
    await screenshot(page, "admin-applications-desktop");

    // Application detail
    await page.getByRole("link", { name: /Review/ }).first().click();
    await expect(page.getByRole("heading", { name: /Record a decision/ })).toBeVisible();
    await screenshot(page, "admin-application-detail-desktop");

    // Areas
    await page.getByRole("link", { name: /Areas/ }).click();
    await expect(page.getByRole("heading", { name: /Official areas, kept deliberately/ })).toBeVisible();
    await screenshot(page, "admin-areas-desktop");

    // Proposals
    await page.getByRole("link", { name: /Proposals/ }).click();
    await expect(page.getByText(/Leads from the community/)).toBeVisible();
    await screenshot(page, "admin-proposals-desktop");

    // Invitation reports
    await page.getByRole("link", { name: /Invitation reports/ }).click();
    await expect(page.getByRole("heading", { name: /A quiet audit trail/ })).toBeVisible();
    await screenshot(page, "admin-invitations-desktop");
  });
});

test.describe("super admin journeys", () => {
  test("super admin accesses accounts and audit log", async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop);
    await page.goto(`${BASE}/apply?mode=login`);
    await page.getByRole("tab", { name: /Sign in/ }).click();
    await page.getByLabel(/Email address/).fill("super@utsav.test");
    await page.getByLabel(/Password/).fill("UtsavTest!2345");
    await page.getByRole("button", { name: /Sign in/ }).click();
    await expect(page).toHaveURL(`${BASE}/admin`);

    // Accounts & roles
    await page.getByRole("link", { name: /Accounts \& roles/ }).click();
    await expect(page.getByRole("heading", { name: /Access is a responsibility, not a badge/ })).toBeVisible();
    await screenshot(page, "super-admin-users-desktop");

    // Audit log
    await page.getByRole("link", { name: /Audit log/ }).click();
    await expect(page.getByRole("heading", { name: /Because trust needs a record/ })).toBeVisible();
    await screenshot(page, "super-admin-audit-desktop");
  });

  test("limited admin cannot access super admin sections", async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop);
    await page.goto(`${BASE}/apply?mode=login`);
    await page.getByRole("tab", { name: /Sign in/ }).click();
    await page.getByLabel(/Email address/).fill("reviewer@utsav.test");
    await page.getByLabel(/Password/).fill("UtsavTest!2345");
    await page.getByRole("button", { name: /Sign in/ }).click();
    await expect(page).toHaveURL(`${BASE}/admin`);
    // reviewer@utsav.test has only application:read:all + devotee:read:all
    // Should NOT see Users or Audit links
    await expect(page.getByRole("link", { name: /Accounts \& roles/ })).not.toBeVisible();
    await expect(page.getByRole("link", { name: /Audit log/ })).not.toBeVisible();
    await screenshot(page, "limited-admin-no-super-desktop");
  });
});

test.describe("public venue page", () => {
  test("Kulti Golf Ground visible with Get Directions and Open in Google Maps", async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop);
    await page.goto(`${BASE}/map`);
    await expect(page.getByText(/Kulti Golf Ground/).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Get directions/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Open in Google Maps/ })).toBeVisible();
    await screenshot(page, "venue-buttons-desktop");
  });

  test("public venue page does not expose campaign geography", async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop);
    await page.goto(`${BASE}/map`);
    // No campaign area names on the public venue page
    await expect(page.getByText(/Baidyanath Dham/)).not.toBeVisible();
    await expect(page.getByText(/Jasidih/)).not.toBeVisible();
    await expect(page.getByText(/Barmasia/)).not.toBeVisible();
    await screenshot(page, "venue-no-campaign-data-desktop");
  });
});

test.describe("apply registration - six fields", () => {
  test("apply form validation errors on empty submit", async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop);
    await page.goto(`${BASE}/apply`);
    await page.getByRole("button", { name: /Submit application/ }).click();
    // Six fields required - validation should show errors
    await expect(page.getByText(/Please enter your full name/)).toBeVisible();
    await screenshot(page, "apply-validation-desktop");
  });
});

test.describe("responsive navigation drawer", () => {
  test("mobile drawer opens and closes", async ({ page }) => {
    await setViewport(page, "mobile");
    await page.goto(`${BASE}/`);
    await expect(page.getByRole("heading", { name: /Every invitation/ })).toBeVisible();
    await page.getByRole("button", { name: /Open menu/ }).click();
    await expect(page.locator("nav").getByRole("link", { name: /About/ })).toBeVisible();
    await expect(page.locator("nav").getByRole("link", { name: /Apply to join/i })).toBeVisible();
    await screenshot(page, "mobile-nav-open");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: /Open menu/ })).toBeVisible();
    await expect(page.locator('button[aria-label="Close menu"]')).toHaveCount(0);
  });
});
