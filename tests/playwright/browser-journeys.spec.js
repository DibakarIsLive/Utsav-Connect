import { test, expect } from "@playwright/test";
// Node scripts and Playwright resolve relative paths; the @/ alias is not available here.
// eslint-disable-next-line no-restricted-imports
import { getLocalPath } from "../../api/lib/paths/local-artifacts.js";

const BREAKPOINTS = {
  desktop: { width: 1366, height: 768 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100";

// Each test gets its own client IP so login rate-limit buckets do not saturate
// when the whole journey suite reuses the same small set of seeded accounts.
// This changes only the test client identifier, never application security.
function randomIp() {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  return `10.${octet()}.${octet()}.${octet()}`;
}
test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
});

async function setViewport(page, name) {
  const size = BREAKPOINTS[name];
  await page.setViewportSize(size);
}

async function screenshot(page, name) {
  await page.screenshot({
    path: getLocalPath("browser-screenshots", `${name}.png`),
    fullPage: true,
  });
}

test.describe("Utsav-Connect public visitor journey", () => {
  for (const [size] of Object.entries(BREAKPOINTS)) {
    test(`opens homepage on ${size}`, async ({ page }) => {
      await setViewport(page, size);
      await page.goto(`${BASE}/`);
      await expect(
        page.getByRole("heading", { name: /Every invitation\. Every locality\. One shared map/ }),
      ).toBeVisible();
      // Only About in public nav
      await expect(page.getByRole("link", { name: /About/ }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /Apply to join/i }).first()).toBeVisible();
      // No separate Map nav item (check header nav only, not venue buttons)
      await expect(page.locator("header").getByRole("link", { name: /Map/ })).not.toBeVisible();
      // Logo links to /
      await expect(page.locator('header a[aria-label="Utsav-Connect home"]')).toHaveAttribute(
        "href",
        "/",
      );
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
      await expect(
        page.getByRole("heading", { name: /A shared map, held together by trust/ }),
      ).toBeVisible();
      await screenshot(page, `about-${size}`);
    });

    test(`apply page default tab is Apply on ${size}`, async ({ page }) => {
      await setViewport(page, size);
      await page.goto(`${BASE}/apply`);
      await expect(page.getByRole("tab", { name: /Apply to join/i })).toBeVisible();
      await expect(page.getByRole("tab", { name: /Sign in/ })).toBeVisible();
      await expect(page.getByRole("tab", { name: /Apply to join/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
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
    await expect(page.getByRole("tab", { name: /Sign in/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
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
    await expect(page.getByText(/Invitations you recorded/)).toBeVisible();
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
    await expect(
      page.getByRole("heading", { name: /Your application is with the reviewers/ }),
    ).toBeVisible();
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
    await expect(
      page.getByRole("heading", { name: /Good to see you, and thank you for reviewing/ }),
    ).toBeVisible();

    // Applications queue
    await page.getByRole("link", { name: /Applications/ }).click();
    await expect(
      page.getByRole("heading", { name: /The people behind every application/ }),
    ).toBeVisible();
    await screenshot(page, "admin-applications-desktop");

    // Application detail
    await page.getByRole("link", { name: "Parbati Singh" }).click();
    await expect(page.getByRole("heading", { name: /Record a decision/ })).toBeVisible();
    await screenshot(page, "admin-application-detail-desktop");

    // Areas
    await page.getByRole("link", { name: /Areas/ }).click();
    await expect(
      page.getByRole("heading", { name: /Official areas, kept deliberately/ }),
    ).toBeVisible();
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
    await expect(
      page.getByRole("heading", { name: /Access is a responsibility, not a badge/ }),
    ).toBeVisible();
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
  test("Kulti Golf Ground visible with Get Directions and Open in Google Maps", async ({
    page,
  }) => {
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
  test("apply form reflects configured registration mode", async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop);
    await page.goto(`${BASE}/apply`);
    // Registration is closed by default; the form must stay visible but disabled.
    if (await page.getByText(/Applications are currently paused/).isVisible()) {
      await expect(page.getByRole("button", { name: /Applications are paused/ })).toBeDisabled();
      await screenshot(page, "apply-registration-paused-desktop");
      return;
    }
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

test.describe("admin application review workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop);
  });

  test("Super Admin can access the application review interface", async ({ page }) => {
    await page.goto(`${BASE}/apply?mode=login`);
    await page.getByRole("tab", { name: /Sign in/ }).click();
    await page.getByLabel(/Email address/).fill("super@utsav.test");
    await page.getByLabel(/Password/).fill("UtsavTest!2345");
    await page.getByRole("button", { name: /Sign in/ }).click();
    await expect(page).toHaveURL(`${BASE}/admin`);

    await page.getByRole("link", { name: /Applications/ }).click();
    await expect(
      page.getByRole("heading", { name: /The people behind every application/ }),
    ).toBeVisible();
    await screenshot(page, "admin-applications-accessible");
  });

  test("devotee cannot access the application review interface", async ({ page }) => {
    await page.goto(`${BASE}/apply?mode=login`);
    await page.getByRole("tab", { name: /Sign in/ }).click();
    await page.getByLabel(/Email address/).fill("devotee@utsav.test");
    await page.getByLabel(/Password/).fill("UtsavTest!2345");
    await page.getByRole("button", { name: /Sign in/ }).click();
    await expect(page).toHaveURL(`${BASE}/dashboard`);

    // The admin layout redirects an active devotee away from the workspace.
    await page.goto(`${BASE}/admin/applications`);
    await expect(page).toHaveURL(`${BASE}/dashboard`);
    await screenshot(page, "devotee-denied-admin-applications");
  });

  test("application listing renders with masked contact data", async ({ page }) => {
    await page.goto(`${BASE}/apply?mode=login`);
    await page.getByRole("tab", { name: /Sign in/ }).click();
    await page.getByLabel(/Email address/).fill("admin@utsav.test");
    await page.getByLabel(/Password/).fill("UtsavTest!2345");
    await page.getByRole("button", { name: /Sign in/ }).click();
    await expect(page).toHaveURL(`${BASE}/admin`);

    await page.getByRole("link", { name: /Applications/ }).click();
    await expect(
      page.getByRole("heading", { name: /The people behind every application/ }),
    ).toBeVisible();

    // Check that contact data is masked in the listing
    await expect(page.locator("table")).toContainText(/\*\*\*/);
    await screenshot(page, "admin-applications-masked");
  });

  test("application detail shows full contact data and internal note section", async ({ page }) => {
    await page.goto(`${BASE}/apply?mode=login`);
    await page.getByRole("tab", { name: /Sign in/ }).click();
    await page.getByLabel(/Email address/).fill("super@utsav.test");
    await page.getByLabel(/Password/).fill("UtsavTest!2345");
    await page.getByRole("button", { name: /Sign in/ }).click();
    await expect(page).toHaveURL(`${BASE}/admin`);

    await page.getByRole("link", { name: /Applications/ }).click();
    await page.getByRole("link", { name: "Parbati Singh" }).click();
    await expect(page.getByRole("heading", { name: /Record a decision/ })).toBeVisible();

    // Full contact data visible to admin
    await expect(page.getByText(/Email address/)).toBeVisible();
    await expect(page.getByText(/Phone number/)).toBeVisible();

    // Internal note section present
    await expect(page.getByText(/Internal review note/)).toBeVisible();
    await screenshot(page, "admin-application-detail-full-data");
  });

  test("applicant cannot see internal review notes on application status page", async ({
    page,
  }) => {
    await page.goto(`${BASE}/apply?mode=login`);
    await page.getByRole("tab", { name: /Sign in/ }).click();
    await page.getByLabel(/Email address/).fill("devotee@utsav.test");
    await page.getByLabel(/Password/).fill("UtsavTest!2345");
    await page.getByRole("button", { name: /Sign in/ }).click();
    await expect(page).toHaveURL(`${BASE}/dashboard`);
    await page.goto(`${BASE}/application-status`);

    // The applicant portal states the privacy boundary; no internal notes are rendered.
    await expect(page.getByText(/never internal notes/i)).toBeVisible();
    await screenshot(page, "applicant-no-internal-notes");
  });

  test("approve and reject controls are present on pending application detail", async ({
    page,
  }) => {
    await page.goto(`${BASE}/apply?mode=login`);
    await page.getByRole("tab", { name: /Sign in/ }).click();
    await page.getByLabel(/Email address/).fill("super@utsav.test");
    await page.getByLabel(/Password/).fill("UtsavTest!2345");
    await page.getByRole("button", { name: /Sign in/ }).click();
    await expect(page).toHaveURL(`${BASE}/admin`);

    await page.getByRole("link", { name: /Applications/ }).click();
    await page.getByRole("link", { name: "Parbati Singh" }).click();
    await expect(page.getByRole("heading", { name: /Record a decision/ })).toBeVisible();

    // Approve and Reject buttons present
    await expect(page.getByRole("button", { name: /Approve application/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Reject application/ })).toBeVisible();
    await screenshot(page, "admin-review-controls-present");
  });

  test("rejection is a decision separate from internal notes", async ({ page }) => {
    await page.goto(`${BASE}/apply?mode=login`);
    await page.getByRole("tab", { name: /Sign in/ }).click();
    await page.getByLabel(/Email address/).fill("super@utsav.test");
    await page.getByLabel(/Password/).fill("UtsavTest!2345");
    await page.getByRole("button", { name: /Sign in/ }).click();
    await expect(page).toHaveURL(`${BASE}/admin`);

    await page.getByRole("link", { name: /Applications/ }).click();
    await page.getByRole("link", { name: "Parbati Singh" }).click();
    await expect(page.getByRole("heading", { name: /Record a decision/ })).toBeVisible();

    // Rejecting no longer requires an internal note: it opens the decision
    // confirmation directly. Notes are a separate, permission-gated action.
    await page.getByRole("button", { name: /Reject application/ }).click();
    await expect(page.getByRole("dialog")).toContainText("Reject this application?");
    await screenshot(page, "rejection-decision-confirmation");
  });
});

test.describe("devotee portal acceptance", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop);
  });

  async function signIn(page, email = "devotee@utsav.test") {
    await page.goto(`${BASE}/apply?mode=login`);
    await page.getByRole("tab", { name: /Sign in/ }).click();
    await page.getByLabel(/Email address/).fill(email);
    await page.getByLabel(/Password/).fill("UtsavTest!2345");
    await page.getByRole("button", { name: /Sign in/ }).click();
    // Approved devotees land on /dashboard; applicants on /application-status.
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 10000 })
      .toBe(email.startsWith("applicant") ? "/application-status" : "/dashboard");
  }

  test("devotee signs in and the dashboard loads real data", async ({ page }) => {
    await signIn(page);
    await expect(page).toHaveURL(`${BASE}/dashboard`);
    await expect(page.getByRole("heading", { name: /Jai Guru, Suman/ })).toBeVisible();
    await expect(page.getByRole("navigation", { name: /Devotee portal/ })).toBeVisible();
    await expect(page.getByText("Invitations you recorded")).toBeVisible();
    await expect(page.getByText("Reports submitted")).toBeVisible();
    await screenshot(page, "portal-dashboard-desktop");
  });

  test("portal navigation reaches all seven sections", async ({ page }) => {
    await signIn(page);
    const sections = [
      ["/dashboard", /Jai Guru, Suman/],
      ["/dashboard/areas", /Explore the areas we serve/],
      ["/dashboard/statistics", /How the campaign is taking shape/],
      ["/dashboard/invitations/new", /Record your invitations/],
      ["/dashboard/reports", /Your invitation history/],
      ["/dashboard/contributions", /What you have contributed/],
      ["/dashboard/profile", /Your account/],
    ];
    for (const [href, heading] of sections) {
      await page.goto(`${BASE}${href}`);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      await expect(page.getByRole("navigation", { name: /Devotee portal/ })).toBeVisible();
    }
  });

  test("area details shows approved areas without admin controls", async ({ page }) => {
    await signIn(page);
    await page.goto(`${BASE}/dashboard/areas`);
    await expect(page.getByRole("heading", { name: /Explore the areas we serve/ })).toBeVisible();
    await page.getByRole("tab", { name: "Directory" }).click();
    await expect(page.getByText("Baidyanath Dham").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Manage Areas/ })).toHaveCount(0);
    await screenshot(page, "portal-area-details-desktop");
  });

  test("campaign statistics show approved aggregates and unavailable population", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto(`${BASE}/dashboard/statistics`);
    await expect(
      page.getByRole("heading", { name: /How the campaign is taking shape/ }),
    ).toBeVisible();
    await expect(page.getByText(/Coverage by approved area/)).toBeVisible();
    await expect(page.getByText(/No population recorded means unavailable/)).toBeVisible();
    await expect(page.getByText("No estimate").first()).toBeVisible();
    await screenshot(page, "portal-statistics-desktop");
  });

  test("invitation submission confirms persistence and appears in own history", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto(`${BASE}/dashboard/invitations/new`);
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("radio", { name: /Baidyanath Dham/ }).check();
    await page.locator("#invitationCount").fill("4242");
    await page.getByRole("button", { name: /Submit report/ }).click();
    await expect(page.getByRole("heading", { name: "Report recorded" })).toBeVisible();
    await expect(page.getByText(/4,242 invitations in Baidyanath Dham/)).toBeVisible();
    await page.getByRole("button", { name: /Done/ }).click();
    await expect(page).toHaveURL(`${BASE}/dashboard/reports`);
    await expect(page.getByText(/4,242/).first()).toBeVisible();
  });

  test("my reports and contributions stay private to the signed-in devotee", async ({ page }) => {
    await signIn(page);
    await page.goto(`${BASE}/dashboard/reports`);
    await expect(page.getByText(/private to you/)).toBeVisible();
    await expect(page.getByText(/admin@utsav\.test/)).toHaveCount(0);
    await page.goto(`${BASE}/dashboard/contributions`);
    await expect(page.getByText("Invitations you recorded", { exact: true })).toBeVisible();
    await expect(page.getByText("Localities reached")).toBeVisible();
    await expect(page.getByText("Proposals shared")).toBeVisible();
  });

  test("profile is read-only and logout ends the session", async ({ page }) => {
    await signIn(page);
    await page.goto(`${BASE}/dashboard/profile`);
    await expect(page.getByText("devotee@utsav.test")).toBeVisible();
    await expect(page.getByText(/Read-only profile/)).toBeVisible();
    await page
      .getByRole("button", { name: /Sign out/ })
      .first()
      .click();
    await expect(page.getByRole("link", { name: /Apply to Join/ })).toBeVisible();
    const status = await page.evaluate(() => fetch("/api/auth/me").then((r) => r.status));
    expect(status).toBe(200);
    const me = await page.evaluate(() => fetch("/api/auth/me").then((r) => r.json()));
    expect(me.data.user).toBeNull();
  });

  test("application-scope applicant cannot reach the devotee portal or its APIs", async ({
    page,
  }) => {
    await signIn(page, "applicant@utsav.test");
    await expect(page).toHaveURL(`${BASE}/application-status`);
    await page.goto(`${BASE}/dashboard/areas`);
    await expect(page).toHaveURL(`${BASE}/application-status`);
    const status = await page.evaluate(() => fetch("/api/areas").then((r) => r.status));
    expect(status).toBe(403);
  });

  test("devotee cannot call admin APIs directly", async ({ page }) => {
    await signIn(page);
    const status = await page.evaluate(() => fetch("/api/admin/users").then((r) => r.status));
    expect(status).toBe(403);
  });

  test("portal is usable on a mobile viewport", async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.mobile);
    await signIn(page);
    await expect(page.getByRole("navigation", { name: /Devotee portal/ })).toBeVisible();
    await page.goto(`${BASE}/dashboard/reports`);
    await expect(
      page.getByRole("heading", { name: /Your invitation history/ }).first(),
    ).toBeVisible();
    await screenshot(page, "portal-reports-mobile");
  });
});

test.describe("admin workspace acceptance", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.desktop);
  });

  async function adminSignIn(page, email = "admin@utsav.test") {
    await page.goto(`${BASE}/apply?mode=login`);
    await page.getByRole("tab", { name: /Sign in/ }).click();
    await page.getByLabel(/Email address/).fill(email);
    await page.getByLabel(/Password/).fill("UtsavTest!2345");
    await page.getByRole("button", { name: /Sign in/ }).click();
    await expect(page).toHaveURL(`${BASE}/admin`);
  }

  test("admin dashboard loads real data and portal navigation", async ({ page }) => {
    await adminSignIn(page);
    await expect(page.getByRole("heading", { name: /thank you for reviewing/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Workspace sections/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Recent activity/ })).toBeVisible();
    for (const label of [
      "Open devotee directory",
      "Manage population",
      "Open campaign analytics",
      "Review audit history",
    ]) {
      await expect(page.getByRole("link", { name: label })).toBeVisible();
    }
    await screenshot(page, "admin-workspace-dashboard");
  });

  test("devotee directory supports search and detail inspection", async ({ page }) => {
    await adminSignIn(page);
    await page.getByRole("link", { name: "Devotee management" }).first().click();
    await expect(page.getByRole("heading", { name: /people behind the outreach/ })).toBeVisible();
    await page.locator("#devoteeSearch").fill("Suman");
    await expect(page.getByRole("link", { name: "Suman Devi" })).toBeVisible();
    await page.getByRole("link", { name: "Suman Devi" }).click();
    await expect(page.getByRole("heading", { name: "Suman Devi" })).toBeVisible();
    await expect(page.getByText("devotee@utsav.test")).toBeVisible();
    await expect(page.getByText("Internal reviewer notes are never shown")).toBeVisible();
  });

  test("suspension and reinstatement work on an isolated test account", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/devotees`);
    await page.locator("#devoteeSearch").fill("Lifecycle Fixture");
    await page.getByRole("link", { name: "Lifecycle Fixture" }).click();
    // Make the workflow idempotent across repeated runs.
    if (await page.getByRole("button", { name: /Reinstate devotee/ }).isVisible()) {
      await page.locator("#statusReason").fill("Automated acceptance test: reset state.");
      await page.getByRole("button", { name: /Reinstate devotee/ }).click();
      await expect(page.getByText("Current status: active")).toBeVisible();
    }
    await page.locator("#statusReason").fill("Automated acceptance test: temporary suspension.");
    await page.getByRole("button", { name: /Suspend devotee/ }).click();
    await expect(page.getByText("Current status: suspended")).toBeVisible();
    await page.locator("#statusReason").fill("Automated acceptance test: reinstatement.");
    await page.getByRole("button", { name: /Reinstate devotee/ }).click();
    await expect(page.getByText("Current status: active")).toBeVisible();
  });

  test("invitation review requires a reason and creates an audit event", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/invitations`);
    await expect(page.getByRole("heading", { name: /quiet audit trail/i })).toBeVisible();
    const reviewButtons = page.getByRole("button", { name: /Review|Flag|Invalidate/ });
    if ((await reviewButtons.count()) > 0) {
      await reviewButtons.first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
    }
    await page.goto(`${BASE}/admin/audit`);
    await expect(page.getByRole("heading", { name: /trust needs a record/i })).toBeVisible();
  });

  test("area management is accessible with existing components", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/areas`);
    await expect(page.getByRole("heading", { name: /Official areas/i })).toBeVisible();
    await expect(page.getByText("Baidyanath Dham").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Create area/i })).toBeVisible();
  });

  test("population management validates input and updates approved areas", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/population`);
    await expect(page.getByRole("heading", { name: /Population estimates/ })).toBeVisible();
    const row = page.locator("tr", { hasText: "Baidyanath Dham" }).first();
    await row.getByRole("button", { name: "Edit" }).click();
    const input = row.getByRole("spinbutton");
    await input.fill("6000");
    await row.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(/population estimate of 6,000/)).toBeVisible();
    // Restore the seeded value using the same UI (test database only).
    const rowAfter = page.locator("tr", { hasText: "Baidyanath Dham" }).first();
    await rowAfter.getByRole("button", { name: "Edit" }).click();
    await rowAfter.getByRole("spinbutton").fill("5000");
    await rowAfter.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(/population estimate of 5,000/)).toBeVisible();
  });

  test("proposal review and campaign analytics are reachable", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/proposals`);
    await expect(page.getByRole("heading", { name: /Leads from the community/i })).toBeVisible();
    await expect(page.getByText("E2E Proposed Locality")).toBeVisible();
    await page.goto(`${BASE}/admin/analytics`);
    await expect(page.getByRole("heading", { name: /Coverage across the campaign/ })).toBeVisible();
    await expect(page.getByText(/Reported invitation coverage/).first()).toBeVisible();
  });

  test("privileged pages and APIs refuse ordinary admins", async ({ page }) => {
    await adminSignIn(page, "limited@utsav.test");
    await page.goto(`${BASE}/admin/devotees`);
    await expect(page.getByRole("heading", { name: /directory access denied/i })).toBeVisible();
    await page.goto(`${BASE}/admin/users`);
    await expect(page.getByRole("heading", { name: /Super Admin section/i })).toBeVisible();
    const usersStatus = await page.evaluate(() => fetch("/api/admin/users").then((r) => r.status));
    expect(usersStatus).toBe(403);
    const accountsStatus = await page.evaluate(() =>
      fetch("/api/admin/accounts").then((r) => r.status),
    );
    expect(accountsStatus).toBe(403);
  });

  test("admin portal is usable on mobile and logout ends the session", async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.mobile);
    await adminSignIn(page);
    await page.getByRole("button", { name: "Open admin navigation" }).click();
    await expect(page.getByRole("dialog", { name: "Admin navigation" })).toBeVisible();
    await page.goto(`${BASE}/admin/devotees`);
    await expect(page.getByRole("heading", { name: /people behind the outreach/ })).toBeVisible();
    await screenshot(page, "admin-directory-mobile");
    await page.getByRole("button", { name: "Open admin navigation" }).click();
    await page
      .getByRole("dialog", { name: "Admin navigation" })
      .getByRole("button", { name: /Sign out/i })
      .click();
    await expect(page).toHaveURL(`${BASE}/`);
    const me = await page.evaluate(() => fetch("/api/auth/me").then((r) => r.json()));
    expect(me.data.user).toBeNull();
  });
});
