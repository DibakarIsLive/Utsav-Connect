import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import mongoose from "mongoose";
import { loadLocalEnvFile } from "../../scripts/lib/load-env-file.js";
// Node scripts and Playwright resolve relative paths; the @/ alias is not available here.
// eslint-disable-next-line no-restricted-imports
import { getDevMailDir } from "../../api/lib/paths/local-artifacts.js";
// Node scripts and Playwright resolve relative paths; the @/ alias is not available here.

loadLocalEnvFile();

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100";
const TEST_DB_URI = process.env.MONGODB_URI_TEST;
const MAIL_DIR = getDevMailDir();

function randomIp() {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  return `10.${octet()}.${octet()}.${octet()}`;
}

function dbNameGuard() {
  const name = new URL(TEST_DB_URI).pathname.split("?")[0].slice(1);
  if (!name.endsWith("_test") || name === "utsav_connect_pilot") {
    throw new Error(`Refusing invitation browser test against database ${name}`);
  }
  return name;
}

function findInvitationEmail(email) {
  if (!readdirSync(MAIL_DIR).length) return null;
  const files = readdirSync(MAIL_DIR)
    .filter((file) => file.endsWith(".eml"))
    .map((file) => ({
      file,
      path: join(MAIL_DIR, file),
      mtime: readFileSync(join(MAIL_DIR, file), "utf8"),
    }))
    .filter((entry) => entry.mtime.includes(`To: ${email}`))
    .sort((a, b) => (a.file < b.file ? -1 : 1));
  return files.at(-1) ?? null;
}

function extractToken(content) {
  const match = content.match(/accept-invitation\?token=([A-Za-z0-9_-]{43})/);
  return match?.[1] ?? null;
}

async function signIn(page, email) {
  await page.goto(`${BASE}/apply?mode=login`);
  await page.getByRole("tab", { name: /Sign in/ }).click();
  await page.getByLabel(/Email address/).fill(email);
  await page.getByLabel(/Password/).fill("UtsavTest!2345");
  await page.getByRole("button", { name: /Sign in/ }).click();
  await expect(page).toHaveURL(`${BASE}/admin`);
}

async function fillAcceptance(page, token, email) {
  await page.goto(`${BASE}/accept-invitation?token=${token}`);
  await page.locator("#inviteFullName").fill(`Browser Invitee ${email.split("@")[0]}`);
  await page.locator("#invitePassword").fill("BrowserInvite!2345");
  await page.locator("#invitePhone").fill("+919876543601");
  await page.locator("#inviteGender").selectOption("male");
  await page.getByRole("button", { name: "Accept invitation" }).click();
}

test.describe("administrator invitation browser flow", () => {
  const createdTokenIds = [];
  const createdUserIds = [];

  test.beforeAll(async () => {
    dbNameGuard();
    await mongoose.connect(TEST_DB_URI, { serverSelectionTimeoutMS: 8000 });
  });

  test.afterAll(async () => {
    const db = mongoose.connection.db;
    if (createdUserIds.length) {
      await db.collection("sessions").deleteMany({ userId: { $in: createdUserIds } });
      await db.collection("users").deleteMany({ _id: { $in: createdUserIds } });
    }
    if (createdTokenIds.length) {
      await db.collection("authtokens").deleteMany({ _id: { $in: createdTokenIds } });
    }
    await mongoose.disconnect();
  });

  test("creates an invitation, accepts it from the dev email, and refuses reuse", async ({
    page,
    browser,
  }) => {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const email = `invite-browser-${stamp}@example.com`;
    await page.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
    await signIn(page, "super@utsav.test");

    const invite = await page.evaluate(async (inviteeEmail) => {
      const response = await fetch("/api/admin/users/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: inviteeEmail,
          permissions: ["application:read:all", "devotee:read:all"],
        }),
      });
      return { status: response.status, body: await response.json().catch(() => null) };
    }, email);
    expect(invite.status).toBe(201);

    let mail = null;
    await expect
      .poll(
        () => {
          mail = findInvitationEmail(email);
          return Boolean(mail);
        },
        { timeout: 15000 },
      )
      .toBe(true);
    const token = extractToken(mail.mtime);
    expect(token).toBeTruthy();
    const tokenDoc = await mongoose.connection.db.collection("authtokens").findOne({ email });
    createdTokenIds.push(tokenDoc._id);

    const acceptContext = await browser.newContext();
    await acceptContext.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
    const acceptPage = await acceptContext.newPage();
    await fillAcceptance(acceptPage, token, email);
    await expect(acceptPage.getByText("Account created.")).toBeVisible({ timeout: 10000 });

    const account = await page.evaluate(async (inviteeEmail) => {
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(inviteeEmail)}`);
      const body = await response.json();
      return body?.data?.users?.[0] ?? null;
    }, email);
    expect(account).toBeTruthy();
    expect(account.role).toBe("admin");
    expect(account.adminPermissions).toEqual(
      expect.arrayContaining(["application:read:all", "devotee:read:all"]),
    );
    createdUserIds.push(new mongoose.Types.ObjectId(account._id));

    // The same token cannot be reused.
    const reuse = await acceptContext.request.post(`${BASE}/api/auth/admin-invitation/accept`, {
      headers: { "content-type": "application/json", "x-forwarded-for": randomIp() },
      data: {
        token,
        fullName: "Reuse Attempt",
        password: "ReuseAttempt!2345",
        phone: "+919876543602",
        gender: "male",
      },
    });
    expect(reuse.status()).toBe(400);

    // The consumed .eml file can be removed; no file outside .local is touched.
    unlinkSync(mail.path);
    await acceptContext.close();
  });

  test("shows useful errors for invalid, expired and revoked invitations", async ({
    page,
    browser,
  }) => {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const expiredEmail = `expired-browser-${stamp}@example.com`;
    const revokedEmail = `revoked-browser-${stamp}@example.com`;

    await page.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
    await signIn(page, "super@utsav.test");

    const create = async (inviteeEmail) =>
      page.evaluate(async (email) => {
        const response = await fetch("/api/admin/users/invitations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, permissions: [] }),
        });
        return response.status;
      }, inviteeEmail);
    expect(await create(expiredEmail)).toBe(201);
    expect(await create(revokedEmail)).toBe(201);

    const tokenFor = async (email) => {
      let mail = null;
      await expect
        .poll(
          () => {
            mail = findInvitationEmail(email);
            return Boolean(mail);
          },
          { timeout: 15000 },
        )
        .toBe(true);
      const token = extractToken(mail.mtime);
      expect(token).toBeTruthy();
      const document = await mongoose.connection.db.collection("authtokens").findOne({ email });
      createdTokenIds.push(document._id);
      unlinkSync(mail.path);
      return token;
    };

    const expiredRawToken = await tokenFor(expiredEmail);
    const revokedRawToken = await tokenFor(revokedEmail);
    const db = mongoose.connection.db;
    const expiredDocument = await db.collection("authtokens").findOne({ email: expiredEmail });
    const revokedDocument = await db.collection("authtokens").findOne({ email: revokedEmail });
    await db
      .collection("authtokens")
      .updateOne(
        { _id: expiredDocument._id },
        { $set: { expiresAt: new Date(Date.now() - 1000) } },
      );

    const revoke = await page.evaluate(async (id) => {
      const response = await fetch(`/api/admin/users/invitations/${id}/revoke`, {
        method: "PATCH",
      });
      return response.status;
    }, revokedDocument._id.toString());
    expect(revoke).toBe(200);

    const openAcceptance = async (token) => {
      const context = await browser.newContext();
      await context.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
      const acceptPage = await context.newPage();
      await fillAcceptance(acceptPage, token, `error-${stamp}@example.com`);
      await expect(acceptPage.getByText(/invalid, already used, or has expired/i)).toBeVisible({
        timeout: 10000,
      });
      await context.close();
    };

    await openAcceptance("not-a-valid-invitation-token");
    await openAcceptance(expiredRawToken);
    await openAcceptance(revokedRawToken);
  });
});
