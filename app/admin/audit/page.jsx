import { cookies } from "next/headers";
import { parseSessionToken } from "@/api/lib/auth/session";
import { validateSession } from "@/api/services/auth-service";
import AdminAuditClient from "@/ui/components/admin/AdminAuditClient";
import AdminDenied from "@/ui/components/admin/AdminDenied";

export const metadata = {
  title: "Audit log",
  description: "Super Admin append-only audit trail for the Utsav-Connect workspace.",
};

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const cookieStore = await cookies();
  const token = parseSessionToken(cookieStore.toString());
  const admin = token ? await validateSession(token) : null;

  if (!admin || admin.role !== "super_admin") {
    return <AdminDenied title="The audit log is a Super Admin section" />;
  }

  return <AdminAuditClient />;
}
