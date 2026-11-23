import { cookies } from "next/headers";
import { parseSessionToken } from "@/api/lib/auth/session";
import { validateSession } from "@/api/services/auth-service";
import { hasAdminPermission } from "@/ui/lib/admin-navigation";
import AdminDenied from "@/ui/components/admin/AdminDenied";
import AdminDevoteesClient from "@/ui/components/admin/AdminDevoteesClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Devotee management",
  description: "Shared account directory for authorised administrators.",
};

export default async function DevoteesPage() {
  const cookieStore = await cookies();
  const token = parseSessionToken(cookieStore.toString());
  const admin = token ? await validateSession(token) : null;

  if (!admin || !hasAdminPermission(admin, "devotee:read:all")) {
    return <AdminDenied permission="devotee:read:all" title="Devotee directory access denied" />;
  }

  const canManage = hasAdminPermission(admin, "devotee:status:update");
  return <AdminDevoteesClient canManage={canManage} />;
}
