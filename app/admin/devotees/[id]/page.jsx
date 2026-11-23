import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { parseSessionToken } from "@/api/lib/auth/session";
import { validateSession } from "@/api/services/auth-service";
import { getDevoteeAccount } from "@/api/services/devotee-directory-service";
import { hasAdminPermission } from "@/ui/lib/admin-navigation";
import AdminDenied from "@/ui/components/admin/AdminDenied";
import AdminPageHeader from "@/ui/components/admin/AdminPageHeader";
import Notice from "@/ui/components/ui/Notice";
import Badge, { StatusBadge } from "@/ui/components/ui/Badge";
import { formatDate } from "@/ui/lib/format";
import DevoteeStatusActions from "@/ui/components/admin/DevoteeStatusActions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Devotee account detail",
  description: "Account and application summary for an authorised administrator.",
};

export default async function DevoteeDetailPage({ params }) {
  const cookieStore = await cookies();
  const token = parseSessionToken(cookieStore.toString());
  const admin = token ? await validateSession(token) : null;

  if (!admin || !hasAdminPermission(admin, "devotee:read:all")) {
    return <AdminDenied permission="devotee:read:all" title="Devotee directory access denied" />;
  }

  const { id } = await params;
  let account;
  try {
    account = await getDevoteeAccount(admin, id);
  } catch (error) {
    if (error?.code === "NOT_FOUND") notFound();
    throw error;
  }

  const canManage = hasAdminPermission(admin, "devotee:status:update");
  const rows = [
    { label: "Full name", value: account.fullName },
    { label: "Email", value: account.email },
    { label: "Phone", value: account.phone },
    { label: "Gender", value: account.gender ?? "Not recorded" },
    { label: "Account status", value: account.status },
    { label: "Email verification", value: account.emailVerified ? "Verified" : "Not verified" },
    { label: "Registered", value: formatDate(account.createdAt) },
    {
      label: "Last sign in",
      value: account.lastLoginAt ? formatDate(account.lastLoginAt) : "Not recorded",
    },
    { label: "Application status", value: account.application?.status ?? "No current application" },
    { label: "Invitation reports", value: String(account.counts.reports) },
    { label: "Locality proposals", value: String(account.counts.proposals) },
  ];

  return (
    <div>
      <AdminPageHeader
        eyebrow="Devotee management"
        title={account.fullName}
        description="Account and application summary. Internal reviewer notes are never shown on this page."
        actions={<Badge tone="neutral">{account.id.slice(-6)}</Badge>}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-2xl border border-line bg-white p-6">
          <dl className="divide-y divide-line">
            {rows.map((row) => (
              <div key={row.label} className="grid gap-1 py-3.5 sm:grid-cols-[12rem_1fr] sm:gap-4">
                <dt className="text-[0.72rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                  {row.label}
                </dt>
                <dd className="text-sm text-bark-900">
                  {row.label === "Account status" || row.label === "Application status" ? (
                    <StatusBadge status={row.value} />
                  ) : (
                    row.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="space-y-4">
          {canManage ? (
            <DevoteeStatusActions accountId={account.id} status={account.status} />
          ) : (
            <Notice tone="info" title="Read-only access">
              Your permissions allow account inspection but not status changes.
            </Notice>
          )}
        </div>
      </div>
    </div>
  );
}
