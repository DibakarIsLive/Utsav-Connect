import { cookies } from "next/headers";
import { parseSessionToken } from "@/api/lib/auth/session";
import { validateSession } from "@/api/services/auth-service";
import { hasAdminPermission } from "@/ui/lib/admin-navigation";
import AdminApplicationsClient from "@/ui/components/admin/AdminApplicationsClient";
import AdminDenied from "@/ui/components/admin/AdminDenied";

export const metadata = {
  title: "Applications",
  description: "Review devotee applications in the Utsav-Connect admin workspace.",
};

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage({ searchParams }) {
  const params = await searchParams;
  const initialStatus =
    typeof params?.status === "string" &&
    ["pending", "approved", "rejected"].includes(params.status)
      ? params.status
      : "";

  const cookieStore = await cookies();
  const token = parseSessionToken(cookieStore.toString());
  const admin = token ? await validateSession(token) : null;

  if (!hasAdminPermission(admin, "application:read:all")) {
    return <AdminDenied permission="application:read:all" />;
  }

  return (
    <AdminApplicationsClient
      initialStatus={initialStatus}
      canReview={hasAdminPermission(admin, "application:review:all")}
    />
  );
}
