import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetEnvCache } from "@/api/lib/env/env";
import { connectToDatabase, disconnectFromDatabase } from "@/api/lib/mongodb/connection";
import { TEST_DB_URI, databaseSuiteGate } from "../helpers/database.js";
import { User } from "@/api/models/user.js";
import { AuthToken } from "@/api/models/auth-token.js";
import { hashPassword } from "@/api/lib/auth/password.js";
import { hashToken } from "@/api/lib/auth/tokens.js";
import { login, logout } from "@/api/services/auth-service.js";
import { POST as postInvitation } from "@/app/api/admin/users/invitations/route.js";

const gate = await databaseSuiteGate("admin-invitation");

describe.skipIf(gate.skip)("Administrator invitation lifecycle", () => {
  const originalUri = process.env.MONGODB_URI;
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let superAdmin;
  const createdUserIds = [];

  beforeAll(async () => {
    process.env.MONGODB_URI = TEST_DB_URI;
    resetEnvCache();
    await connectToDatabase({ uri: TEST_DB_URI });

    superAdmin = await User.create({
      email: `sa-invite-${runId}@example.com`,
      fullName: "Super Admin Invite Test",
      phone: "+919876543260",
      gender: "male",
      passwordHash: await hashPassword("SuperAdmin123!"),
      role: "super_admin",
      status: "active",
      emailVerified: true,
    });
    createdUserIds.push(superAdmin._id);
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await AuthToken.deleteMany({
        $or: [
          { userId: { $in: createdUserIds } },
          { email: { $in: createdUserIds.map((id) => String(id)) } },
        ],
      });
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    await disconnectFromDatabase();
    process.env.MONGODB_URI = originalUri;
    resetEnvCache();
  });

  it("creates an administrator invitation", async () => {
    const { inviteAdministrator } = await import("@/api/services/admin-service.js");
    const result = await inviteAdministrator(superAdmin, `invitee-${runId}@example.com`, [
      "application:read:all",
      "application:review:all",
    ]);

    expect(result.invitationId).toBeDefined();
    expect(result.emailSent).toBeDefined();

    const invitation = await AuthToken.findById(result.invitationId);
    expect(invitation).not.toBeNull();
    expect(invitation.type).toBe("admin_invitation");
    expect(invitation.email).toBe(`invitee-${runId}@example.com`);
    expect(invitation.metadata.permissions).toEqual([
      "application:read:all",
      "application:review:all",
    ]);
    expect(invitation.usedAt).toBeFalsy();
  });

  it("rejects unknown permission strings", async () => {
    const { inviteAdministrator } = await import("@/api/services/admin-service.js");
    await expect(
      inviteAdministrator(superAdmin, `bad-perm-${runId}@example.com`, [
        "application:read:all",
        "invalid:permission:string",
      ]),
    ).rejects.toThrow(/Invalid permission/);
  });

  it("privilege escalation: cannot assign super_admin-only capabilities via invitation", async () => {
    const { inviteAdministrator } = await import("@/api/services/admin-service.js");
    // ADMIN_PERMISSIONS does not contain any Super Admin-exclusive grants, so
    // even an attempt to pass a crafted string is rejected at validation.
    await expect(
      inviteAdministrator(superAdmin, `escalation-${runId}@example.com`, [
        "application:read:all",
        "super_admin:everything",
      ]),
    ).rejects.toThrow(/Invalid permission/);

    // Verify no account was created
    const user = await User.findOne({ email: `escalation-${runId}@example.com` });
    expect(user).toBeNull();
  });

  it("API route rejects unknown permission strings", async () => {
    const result = await login(superAdmin.email, "SuperAdmin123!", {
      userAgent: "test-agent",
      ip: "127.0.0.1",
    });
    const token = result.sessionCookie.match(/session=([^;]+)/)[1];

    const response = await postInvitation(
      new Request("http://localhost:3000/api/admin/users/invitations", {
        method: "POST",
        headers: {
          cookie: `session=${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: `route-bad-perm-${runId}@example.com`,
          permissions: ["application:read:all", "invalid:permission"],
        }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");

    // Clean up the session
    await logout(token);
  });

  it("refuses invitation from non-Super Admin", async () => {
    const { inviteAdministrator } = await import("@/api/services/admin-service.js");
    const admin = await User.create({
      email: `admin-invite-${runId}@example.com`,
      fullName: "Admin Invite Test",
      phone: "+919876543261",
      gender: "female",
      passwordHash: await hashPassword("Admin123!"),
      role: "admin",
      status: "active",
      emailVerified: true,
      adminPermissions: ["application:read:all"],
    });
    createdUserIds.push(admin._id);

    await expect(
      inviteAdministrator(admin, `someone-${runId}@example.com`, ["application:read:all"]),
    ).rejects.toThrow(/Only Super Admin/);
  });

  it("rejects duplicate active invitations for the same email", async () => {
    const { inviteAdministrator } = await import("@/api/services/admin-service.js");
    const email = `duplicate-invite-${runId}@example.com`;

    await inviteAdministrator(superAdmin, email, ["application:read:all"]);

    await expect(inviteAdministrator(superAdmin, email, ["application:read:all"])).rejects.toThrow(
      /already exists/,
    );
  });

  it("rejects invitation for an existing user", async () => {
    const { inviteAdministrator } = await import("@/api/services/admin-service.js");
    await expect(
      inviteAdministrator(superAdmin, superAdmin.email, ["application:read:all"]),
    ).rejects.toThrow(/already exists/);
  });

  it("accepts an administrator invitation", async () => {
    const { acceptAdminInvitation } = await import("@/api/services/admin-service.js");
    const { generateToken, hashToken } = await import("@/api/lib/auth/tokens.js");

    // Create an invitation with a known raw token
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);

    await AuthToken.create({
      tokenHash,
      email: `accept-${runId}@example.com`,
      type: "admin_invitation",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      metadata: {
        invitedBy: superAdmin._id,
        permissions: ["proposal:review"],
      },
    });

    const accepted = await acceptAdminInvitation(rawToken, {
      fullName: "Invitee User",
      password: "InviteePassword123!",
      phone: "+919876543262",
      gender: "female",
    });

    expect(accepted.userId).toBeDefined();
    expect(accepted.role).toBe("admin");
    expect(accepted.adminPermissions).toEqual(["proposal:review"]);

    // Invitation should now be used
    const invitation = await AuthToken.findOne({ tokenHash });
    expect(invitation.usedAt).toBeTruthy();

    // User should exist
    const newUser = await User.findById(accepted.userId);
    expect(newUser).not.toBeNull();
    expect(newUser.role).toBe("admin");
    expect(newUser.emailVerified).toBe(true);
    expect(newUser.status).toBe("active");
    createdUserIds.push(newUser._id);
  });

  it("rejects an invalid invitation token", async () => {
    const { acceptAdminInvitation } = await import("@/api/services/admin-service.js");
    await expect(
      acceptAdminInvitation("invalid-invite-token-short", {
        fullName: "Test",
        password: "Password123!",
        phone: "+919876543263",
        gender: "male",
      }),
    ).rejects.toThrow(/invalid/);
  });

  it("lists pending administrator invitations", async () => {
    const { listAdminInvitations } = await import("@/api/services/admin-service.js");
    const invitations = await listAdminInvitations(superAdmin);
    expect(Array.isArray(invitations)).toBe(true);
  });

  it("revokes a pending administrator invitation", async () => {
    const { revokeAdminInvitation } = await import("@/api/services/admin-service.js");
    const { generateToken, hashToken } = await import("@/api/lib/auth/tokens.js");

    // Create an invitation with a known raw token
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);

    await AuthToken.create({
      tokenHash,
      email: `revoke-${runId}@example.com`,
      type: "admin_invitation",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      metadata: {
        invitedBy: superAdmin._id,
        permissions: ["area:manage"],
      },
    });

    const invitation = await AuthToken.findOne({ tokenHash });
    const revoked = await revokeAdminInvitation(superAdmin, invitation._id.toString());
    expect(revoked.success).toBe(true);

    const usedInvitation = await AuthToken.findOne({ tokenHash });
    expect(usedInvitation).toBeNull();
  });

  it("refuses revocation from non-Super Admin", async () => {
    const { revokeAdminInvitation } = await import("@/api/services/admin-service.js");
    const admin = await User.create({
      email: `admin-revoke-${runId}@example.com`,
      fullName: "Admin Revoke Test",
      phone: "+919876543264",
      gender: "male",
      passwordHash: await hashPassword("Admin123!"),
      role: "admin",
      status: "active",
      emailVerified: true,
      adminPermissions: ["application:read:all"],
    });
    createdUserIds.push(admin._id);

    await expect(revokeAdminInvitation(admin, "000000000000000000000000")).rejects.toThrow(
      /Only Super Admin/,
    );
  });
});
