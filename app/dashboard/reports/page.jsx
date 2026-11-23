import { requireActiveDevoteePage } from "@/app/_lib/devotee-page";
import { listReports } from "@/api/services/invitation-service";
import PageHero from "@/ui/components/ui/PageHero";
import Notice from "@/ui/components/ui/Notice";
import { ButtonLink } from "@/ui/components/ui/Button";
import ReportHistoryTable from "@/ui/components/invitations/ReportHistoryTable";
import { formatNumber } from "@/ui/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My invitation reports — Devotee portal",
  description: "Your own invitation report history and status.",
};

export default async function ReportsPage() {
  const user = await requireActiveDevoteePage();

  let reports = [];
  let unavailable = false;
  try {
    reports = JSON.parse(JSON.stringify(await listReports(user)));
  } catch {
    unavailable = true;
  }

  const active = reports.filter((report) => report.status === "active");
  const invitations = active.reduce(
    (sum, report) => sum + (Number(report.invitationCount) || 0),
    0,
  );

  return (
    <>
      <PageHero
        eyebrow="Devotee portal"
        title="Your invitation history."
        description="Only your own reports appear here. Flagged and invalid reports remain visible with their status; internal review notes are never included."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Devotee portal", href: "/dashboard" },
          { label: "My invitation reports" },
        ]}
      />
      <div className="shell space-y-6 py-8 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-5 py-4">
          <div>
            <p className="text-[0.68rem] font-bold tracking-[0.12em] text-ink-400 uppercase">
              Your personal totals
            </p>
            <p className="mt-1 text-sm text-bark-900">
              {formatNumber(reports.length)} reports · {formatNumber(invitations)} invitations in
              active reports
            </p>
          </div>
          <ButtonLink href="/dashboard/invitations/new" size="sm">
            Record invitations
          </ButtonLink>
        </div>

        {unavailable ? (
          <Notice tone="error" title="Report history unavailable">
            Your reports could not be loaded. Nothing is shown in their place.
          </Notice>
        ) : (
          <ReportHistoryTable
            reports={reports}
            action={
              <ButtonLink href="/dashboard/invitations/new" size="sm" variant="secondary">
                Record invitations
              </ButtonLink>
            }
          />
        )}
      </div>
    </>
  );
}
