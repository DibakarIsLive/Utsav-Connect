import { cookies } from "next/headers";
import { parseSessionToken } from "@/api/lib/auth/session";
import { validateSession } from "@/api/services/auth-service";
import { hasAdminPermission } from "@/ui/lib/admin-navigation";
import AdminDenied from "@/ui/components/admin/AdminDenied";
import AdminPopulationClient from "@/ui/components/admin/AdminPopulationClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Population management",
  description: "Record population estimates for approved geographic areas.",
};

export default async function PopulationPage() {
  const cookieStore = await cookies();
  const token = parseSessionToken(cookieStore.toString());
  const admin = token ? await validateSession(token) : null;

  if (!admin || !hasAdminPermission(admin, "area:manage")) {
    return <AdminDenied permission="area:manage" title="Population management access denied" />;
  }

  return <AdminPopulationClient />;
}
