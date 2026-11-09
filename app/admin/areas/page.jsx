import { cookies } from "next/headers";
import { parseSessionToken } from "@/api/lib/auth/session";
import { validateSession } from "@/api/services/auth-service";
import { hasAdminPermission } from "@/ui/lib/admin-navigation";
import AdminAreasClient from "@/ui/components/admin/AdminAreasClient";
import AdminDenied from "@/ui/components/admin/AdminDenied";

export const metadata = {
  title: "Areas",
  description: "Manage official campaign areas and their recorded geography.",
};

export const dynamic = "force-dynamic";

export default async function AdminAreasPage({ searchParams }) {
  const params = await searchParams;
  const focus = typeof params?.focus === "string" ? params.focus : "";

  const cookieStore = await cookies();
  const token = parseSessionToken(cookieStore.toString());
  const admin = token ? await validateSession(token) : null;

  if (!hasAdminPermission(admin, "area:manage")) {
    return <AdminDenied permission="area:manage" />;
  }

  return <AdminAreasClient initialFocus={focus} />;
}
