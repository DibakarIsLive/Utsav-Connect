import { cookies } from "next/headers";
import { parseSessionToken } from "@/api/lib/auth/session";
import { validateSession } from "@/api/services/auth-service";
import { hasAdminPermission } from "@/ui/lib/admin-navigation";
import AdminInvitationsClient from "@/ui/components/admin/AdminInvitationsClient";
import AdminDenied from "@/ui/components/admin/AdminDenied";

export const metadata = {
  title: "Invitation reports",
  description: "Review invitation reports and keep public coverage accurate.",
};

export const dynamic = "force-dynamic";

export default async function AdminInvitationsPage() {
  const cookieStore = await cookies();
  const token = parseSessionToken(cookieStore.toString());
  const admin = token ? await validateSession(token) : null;

  const canRead =
    hasAdminPermission(admin, "invitation-report:read:all") || hasAdminPermission(admin, "area:manage");

  if (!canRead) {
    return <AdminDenied permission="invitation-report:read:all" />;
  }

  return <AdminInvitationsClient canReview={canRead} />;
}
