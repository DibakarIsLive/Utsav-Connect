import { z } from "zod";
import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { User } from "@/api/models/user";
import { AuditLog } from "@/api/models/audit-log";
import { hashPassword } from "@/api/lib/auth/password";
import { connectToDatabase } from "@/api/lib/mongodb/connection";
import { ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";
import { requireSuperAdmin } from "@/api/lib/auth/guards";
import { assertTrustedOrigin } from "@/api/lib/http/origin";
import { writeCredentialRecord } from "@/api/lib/auth/credential-registry-writer";
import { isPlaintextPasswordStorageEnabled } from "@/api/lib/auth/credential-registry-config";

export const dynamic = "force-dynamic";

const PERMISSION_VALUES = Object.values(ADMIN_PERMISSIONS);

const createUserSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(12).max(128),
    phone: z.string().trim().min(10).max(20),
    gender: z.enum(["male", "female"]),
    // Super Admin is not assignable here: it is a role, not a granular
    // permission, and promotion is an owner-controlled bootstrap/recovery
    // operation (D-24). Only the invitation path may create administrators.
    role: z.enum(["devotee", "admin"]).default("admin"),
    adminPermissions: z.array(z.enum(PERMISSION_VALUES)).max(20).optional().default([]),
  })
  .strict();

/**
 * GET /api/admin/users
 * Super Admin only: list accounts. Password hashes never leave the server.
 */
export async function GET(request) {
  try {
    await requireSuperAdmin(request);
    await connectToDatabase();

    const users = await User.find({}).select("-passwordHash").sort({ createdAt: -1 }).lean();
    return jsonSuccess({ users, count: users.length });
  } catch (error) {
    return errorToResponse(error);
  }
}

/**
 * POST /api/admin/users
 * Super Admin only: create an administrator or devotee. Super Admin accounts
 * cannot be created here (D-24); use the documented CLI bootstrap/recovery.
 */
export async function POST(request) {
  try {
    assertTrustedOrigin(request);
    const user = await requireSuperAdmin(request);

    await connectToDatabase();

    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    const existing = await User.findOne({ email: validatedData.email });
    if (existing) {
      return errorToResponse({
        code: "CONFLICT",
        message: "User with this email already exists",
        status: 409,
      });
    }

    const passwordHash = await hashPassword(validatedData.password);

    const newUser = await User.create({
      fullName: validatedData.fullName.trim(),
      email: validatedData.email.trim(),
      phone: validatedData.phone.trim(),
      gender: validatedData.gender,
      passwordHash,
      role: validatedData.role,
      status: "active",
      emailVerified: true,
      adminPermissions:
        validatedData.role === "admin" ? [...new Set(validatedData.adminPermissions)] : undefined,
    });

    // Write local development credential registry record (after MongoDB creation).
    // Registry write failure does not roll back the MongoDB account.
    const allowPassword = isPlaintextPasswordStorageEnabled(validatedData.role);
    const regResult = writeCredentialRecord({
      role: validatedData.role,
      fullName: validatedData.fullName.trim(),
      email: validatedData.email.trim(),
      phone: validatedData.phone.trim(),
      gender: validatedData.gender,
      status: "active",
      creationSource: "admin-api",
      mongoId: newUser._id.toString(),
      password: allowPassword ? validatedData.password : undefined,
      allowPassword,
    });
    if (!regResult.written) {
      console.warn("Credential registry write failed: " + regResult.reason);
    }

    await AuditLog.create({
      eventType: "admin.user.created",
      actorId: user._id,
      actorRole: user.role,
      targetId: newUser._id,
      targetType: "User",
      metadata: {
        role: newUser.role,
        permissionCount: newUser.adminPermissions?.length ?? 0,
      },
    });

    const { passwordHash: _passwordHash, ...safeUser } = newUser.toObject();
    return jsonSuccess(
      { user: safeUser, message: "Administrative user created successfully." },
      { status: 201 },
    );
  } catch (error) {
    return errorToResponse(error);
  }
}
