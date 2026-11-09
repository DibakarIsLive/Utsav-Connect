# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browser-journeys.spec.js >> Utsav-Connect public visitor journey >> opens homepage on desktop
- Location: tests/playwright/browser-journeys.spec.js:22:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /Every invitation\. Every locality\. One shared map/ })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: /Every invitation\. Every locality\. One shared map/ }) with timeout 5000ms
  - waiting for getByRole('heading', { name: /Every invitation\. Every locality\. One shared map/ })

```

```yaml
- navigation:
  - button "previous" [disabled]:
    - img "previous"
  - text: 1/ 1
  - button "next" [disabled]:
    - img "next"
- link "Next.js 16.4.4 (stale) Turbopack":
  - /url: https://nextjs.org/docs/messages/version-staleness
  - img
  - text: Next.js 16.4.4 (stale) Turbopack
- dialog "Build Error":
  - text: Build Error
  - button "Copy Error Info":
    - img
  - button "No related documentation found" [disabled]:
    - img
  - button "Attach Node.js inspector":
    - img
  - text: Error evaluating Node.js code
  - img
  - text: ./ui/styles/globals.css
  - button "Open in editor":
    - img
  - text: "Error: Error evaluating Node.js code Error: Node.js subprocess crashed while evaluating loaders [@tailwindcss/turbopack]: failed to receive message Caused by: - Node.js process exited with signal: 9 (SIGKILL) - reading packet length - unexpected end of file"
- button "Open Next.js Dev Tools":
  - img
- button "Open issues overlay": 1 Issue
- alert
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | const BREAKPOINTS = {
  4   |   desktop: { width: 1366, height: 768 },
  5   |   tablet: { width: 768, height: 1024 },
  6   |   mobile: { width: 390, height: 844 },
  7   | };
  8   | 
  9   | const BASE = "http://localhost:3000";
  10  | 
  11  | async function setViewport(page, name) {
  12  |   const size = BREAKPOINTS[name];
  13  |   await page.setViewportSize(size);
  14  | }
  15  | 
  16  | async function screenshot(page, name) {
  17  |   await page.screenshot({ path: `.local/browser-screenshots/${name}.png`, fullPage: true });
  18  | }
  19  | 
  20  | test.describe("Utsav-Connect public visitor journey", () => {
  21  |   for (const [size] of Object.entries(BREAKPOINTS)) {
  22  |     test(`opens homepage on ${size}`, async ({ page }) => {
  23  |       await setViewport(page, size);
  24  |       await page.goto(`${BASE}/`);
> 25  |       await expect(page.getByRole("heading", { name: /Every invitation\. Every locality\. One shared map/ })).toBeVisible();
      |                                                                                                               ^ Error: expect(locator).toBeVisible() failed
  26  |       // Only About in public nav
  27  |       await expect(page.getByRole("link", { name: /About/ }).first()).toBeVisible();
  28  |       await expect(page.getByRole("link", { name: /Apply to join/i }).first()).toBeVisible();
  29  |       // No separate Map nav item (check header nav only, not venue buttons)
  30  |       await expect(page.locator("header").getByRole("link", { name: /Map/ })).not.toBeVisible();
  31  |       // Logo links to /
  32  |       await expect(page.locator('header a[aria-label="Utsav-Connect home"]')).toHaveAttribute("href", "/");
  33  |       await screenshot(page, `homepage-${size}`);
  34  |     });
  35  | 
  36  |     test(`venue page shows Kulti Golf Ground on ${size}`, async ({ page }) => {
  37  |       await setViewport(page, size);
  38  |       await page.goto(`${BASE}/map`);
  39  |       await expect(page.getByRole("heading", { name: /Find the official venue/ })).toBeVisible();
  40  |       await expect(page.getByText(/Kulti Golf Ground/).first()).toBeVisible();
  41  |       await screenshot(page, `venue-${size}`);
  42  |     });
  43  | 
  44  |     test(`about page on ${size}`, async ({ page }) => {
  45  |       await setViewport(page, size);
  46  |       await page.goto(`${BASE}/about`);
  47  |       await expect(page.getByRole("heading", { name: /A shared map, held together by trust/ })).toBeVisible();
  48  |       await screenshot(page, `about-${size}`);
  49  |     });
  50  | 
  51  |     test(`apply page default tab is Apply on ${size}`, async ({ page }) => {
  52  |       await setViewport(page, size);
  53  |       await page.goto(`${BASE}/apply`);
  54  |       await expect(page.getByRole("tab", { name: /Apply to join/i })).toBeVisible();
  55  |       await expect(page.getByRole("tab", { name: /Sign in/ })).toBeVisible();
  56  |       await expect(page.getByRole("tab", { name: /Apply to join/i })).toHaveAttribute("aria-selected", "true");
  57  |       await expect(page.getByLabel(/Full name/)).toBeVisible();
  58  |       await expect(page.getByLabel(/Email address/)).toBeVisible();
  59  |       await expect(page.getByLabel(/Password/)).toBeVisible();
  60  |       await expect(page.getByLabel(/Phone number/)).toBeVisible();
  61  |       await expect(page.getByLabel(/Gender/)).toBeVisible();
  62  |       await expect(page.getByLabel(/Message or background/)).toBeVisible();
  63  |       await screenshot(page, `apply-${size}`);
  64  |     });
  65  |   }
  66  | });
  67  | 
  68  | test.describe("authentication flows", () => {
  69  |   test("/login redirects to /apply?mode=login", async ({ page }) => {
  70  |     await page.setViewportSize(BREAKPOINTS.desktop);
  71  |     await page.goto(`${BASE}/login`);
  72  |     await expect(page).toHaveURL(`${BASE}/apply?mode=login`);
  73  |     await expect(page.getByRole("tab", { name: /Sign in/ })).toBeVisible();
  74  |     await screenshot(page, "login-redirect-desktop");
  75  |   });
  76  | 
  77  |   test("sign in tab exists on /apply with mode=login", async ({ page }) => {
  78  |     await page.setViewportSize(BREAKPOINTS.desktop);
  79  |     await page.goto(`${BASE}/apply?mode=login`);
  80  |     await expect(page.getByRole("tab", { name: /Sign in/ })).toHaveAttribute("aria-selected", "true");
  81  |   });
  82  | 
  83  |   test("sign in and reach dashboard", async ({ page }) => {
  84  |     await page.setViewportSize(BREAKPOINTS.desktop);
  85  |     await page.goto(`${BASE}/apply?mode=login`);
  86  |     await page.getByRole("tab", { name: /Sign in/ }).click();
  87  |     await page.getByLabel(/Email address/).fill("devotee@utsav.test");
  88  |     await page.getByLabel(/Password/).fill("UtsavTest!2345");
  89  |     await page.getByRole("button", { name: /Sign in/ }).click();
  90  |     // Should redirect to dashboard for active devotee
  91  |     await expect(page).toHaveURL(`${BASE}/dashboard`);
  92  |     await expect(page.getByRole("heading", { name: /Jai Guru, Suman/ })).toBeVisible();
  93  |     await screenshot(page, "signed-in-dashboard-desktop");
  94  |   });
  95  | });
  96  | 
  97  | test.describe("devotee dashboard journey", () => {
  98  |   test("active devotee can view dashboard, submit report, view history", async ({ page }) => {
  99  |     await page.setViewportSize(BREAKPOINTS.desktop);
  100 |     await page.goto(`${BASE}/apply?mode=login`);
  101 |     await page.getByRole("tab", { name: /Sign in/ }).click();
  102 |     await page.getByLabel(/Email address/).fill("devotee@utsav.test");
  103 |     await page.getByLabel(/Password/).fill("UtsavTest!2345");
  104 |     await page.getByRole("button", { name: /Sign in/ }).click();
  105 |     await expect(page).toHaveURL(`${BASE}/dashboard`);
  106 | 
  107 |     // Dashboard stats visible
  108 |     await expect(page.getByText(/Invitations in public totals/)).toBeVisible();
  109 |     await expect(page.getByText(/Reports submitted/)).toBeVisible();
  110 |     await expect(page.getByText(/Localities reached/)).toBeVisible();
  111 |     await expect(page.getByText(/Proposals shared/)).toBeVisible();
  112 | 
  113 |     // Record invitations
  114 |     await page.getByRole("button", { name: /Record invitations/ }).click();
  115 |     await expect(page.getByRole("heading", { name: /Record invitations/ })).toBeVisible();
  116 |     await page.getByRole("radio", { name: /Baidyanath Dham/ }).click();
  117 |     await page.getByLabel(/Invitations extended/).fill("50");
  118 |     await page.getByLabel(/Date invitations were extended/).fill("2026-10-01");
  119 |     await page.getByRole("button", { name: /Submit report/ }).click();
  120 |     await expect(page.getByRole("heading", { name: /Report recorded/ })).toBeVisible();
  121 |     await screenshot(page, "devotee-report-submitted-desktop");
  122 | 
  123 |     // Close the success modal and verify the report appears in history
  124 |     await page.keyboard.press("Escape");
  125 |     await expect(page.getByText(/Baidyanath Dham/, { exact: false }).first()).toBeVisible();
```