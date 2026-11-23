import { cookies } from "next/headers";
import { parseSessionToken } from "@/api/lib/auth/session";
import { validateSession } from "@/api/services/auth-service";
import { hasAdminPermission } from "@/ui/lib/admin-navigation";
import AdminAuditClient from "@/ui/components/admin/AdminAuditClient";
import AdminDenied from "@/ui/components/admin/AdminDenied";

export const metadata = {
  title: "Audit log",
  description: "Append-only audit trail for the Utsav-Connect workspace.",
};

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const cookieStore = await cookies();
  const token = parseSessionToken(cookieStore.toString());
  const admin = token ? await validateSession(token) : null;

  if (!hasAdminPermission(admin, "audit:read:all")) {
    return <AdminDenied permission="audit:read:all" />;
  }

  return <AdminAuditClient />;
}
