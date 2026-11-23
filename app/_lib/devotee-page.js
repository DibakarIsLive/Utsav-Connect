import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseSessionToken } from "@/api/lib/auth/session";
import { validateSession } from "@/api/services/auth-service";

/**
 * Server-side gate shared by every devotee-portal page.
 *
 * Anonymous visitors go to sign-in, administrators to their own workspace,
 * and non-active accounts to their application status. All portal data APIs
 * independently enforce full scope, so this gate is for page routing only.
 */
export async function requireActiveDevoteePage() {
  const cookieStore = await cookies();
  const token = parseSessionToken(cookieStore.toString());
  const user = token ? await validateSession(token) : null;

  if (!user) redirect("/apply?mode=login");
  if (user.role === "admin" || user.role === "super_admin") redirect("/admin");
  if (user.status !== "active") redirect("/application-status");

  return user;
}
