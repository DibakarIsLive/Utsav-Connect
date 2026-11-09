import { z } from "zod";
import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { User } from "@/api/models/user";
import { AuditLog } from "@/api/models/audit-log";
import { validateSession } from "@/api/services/auth-service";
import { parseSessionToken } from "@/api/lib/auth/session";
import { hashPassword } from "@/api/lib/auth/password";
import { connectToDatabase } from "@/api/lib/mongodb/connection";
import { ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";

export const dynamic = "force-dynamic";

const PERMISSION_VALUES = Object.values(ADMIN_PERMISSIONS);

const createUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(12).max(128),
  phone: z.string().trim().min(10).max(20),
  gender: z.enum(["male", "female"]),
  role: z.enum(["devotee", "admin", "super_admin"]).default("admin"),
  adminPermissions: z.array(z.enum(PERMISSION_VALUES)).optional().default([]),
});

/**
 * GET /api/admin/users
 * Super Admin only: list accounts. Password hashes never leave the server.
 */
export async function GET(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);
    const user = await validateSession(token);

    if (!user || user.role !== "super_admin") {
      return errorToResponse({
        code: "FORBIDDEN",
        message: "Super Admin access required",
        status: 403,
      });
    }

    await connectToDatabase();

    const users = await User.find({}).select("-passwordHash").sort({ createdAt: -1 }).lean();
    return jsonSuccess({ users, count: users.length });
  } catch (error) {
    return errorToResponse(error);
  }
}

/**
 * POST /api/admin/users
 * Super Admin only: create a new admin or devotee account.
 */
export async function POST(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);
    const user = await validateSession(token);

    if (!user || user.role !== "super_admin") {
      return errorToResponse({
        code: "FORBIDDEN",
        message: "Super Admin access required",
        status: 403,
      });
    }

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
        validatedData.role === "admin" ? validatedData.adminPermissions : undefined,
    });

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
