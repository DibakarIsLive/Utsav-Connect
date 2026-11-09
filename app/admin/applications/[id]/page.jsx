import { cookies } from "next/headers";
import { parseSessionToken } from "@/api/lib/auth/session";
import { validateSession } from "@/api/services/auth-service";
import { hasAdminPermission } from "@/ui/lib/admin-navigation";
import AdminApplicationDetailClient from "@/ui/components/admin/AdminApplicationDetailClient";
import AdminDenied from "@/ui/components/admin/AdminDenied";

export const metadata = {
  title: "Review application",
  description: "Read and decide a devotee application inside the admin workspace.",
};

export const dynamic = "force-dynamic";

export default async function AdminApplicationDetailPage({ params }) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = parseSessionToken(cookieStore.toString());
  const admin = token ? await validateSession(token) : null;

  if (!hasAdminPermission(admin, "application:read:all")) {
    return <AdminDenied permission="application:read:all" />;
  }

  return (
    <AdminApplicationDetailClient
      applicationId={id}
      canReview={hasAdminPermission(admin, "application:review:all")}
    />
  );
}
