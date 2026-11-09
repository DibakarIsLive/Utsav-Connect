import { cookies } from "next/headers";
import { parseSessionToken } from "@/api/lib/auth/session";
import { validateSession } from "@/api/services/auth-service";
import AdminUsersClient from "@/ui/components/admin/AdminUsersClient";
import AdminDenied from "@/ui/components/admin/AdminDenied";

export const metadata = {
  title: "Accounts & roles",
  description: "Super Admin account creation and permission assignment.",
};

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const token = parseSessionToken(cookieStore.toString());
  const admin = token ? await validateSession(token) : null;

  if (!admin || admin.role !== "super_admin") {
    return <AdminDenied title="Accounts & roles is a Super Admin section" />;
  }

  return <AdminUsersClient currentUserId={admin._id} />;
}
