import { cookies } from "next/headers";
import { parseSessionToken } from "@/api/lib/auth/session";
import { validateSession } from "@/api/services/auth-service";
import { hasAdminPermission } from "@/ui/lib/admin-navigation";
import AdminProposalsClient from "@/ui/components/admin/AdminProposalsClient";
import AdminDenied from "@/ui/components/admin/AdminDenied";

export const metadata = {
  title: "Locality proposals",
  description: "Review community locality proposals before they join the official campaign map.",
};

export const dynamic = "force-dynamic";

export default async function AdminProposalsPage() {
  const cookieStore = await cookies();
  const token = parseSessionToken(cookieStore.toString());
  const admin = token ? await validateSession(token) : null;

  const canReview =
    hasAdminPermission(admin, "proposal:review") || hasAdminPermission(admin, "area:manage");

  if (!canReview) {
    return <AdminDenied permission="proposal:review" />;
  }

  return <AdminProposalsClient />;
}
