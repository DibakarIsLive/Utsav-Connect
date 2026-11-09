import Link from "next/link";
import { cookies } from "next/headers";
import { parseSessionToken } from "@/api/lib/auth/session";
import { validateSession } from "@/api/services/auth-service";
import { getApplicationStats, listApplications } from "@/api/services/admin-service";
import { listAdminAreas } from "@/api/services/area-service";
import { listProposals } from "@/api/services/proposal-service";
import { listReports } from "@/api/services/invitation-service";
import {
  hasAdminPermission,
  isSuperAdmin,
} from "@/ui/lib/admin-navigation";
import { ADMIN_PERMISSION_LABELS } from "@/ui/lib/navigation";
import AdminPageHeader from "@/ui/components/admin/AdminPageHeader";
import StatCard from "@/ui/components/ui/StatCard";
import Badge, { StatusBadge } from "@/ui/components/ui/Badge";
import Notice from "@/ui/components/ui/Notice";
import EmptyState from "@/ui/components/ui/EmptyState";
import Reveal from "@/ui/components/ui/Reveal";
import { ButtonLink, ArrowRight } from "@/ui/components/ui/Button";
import { formatDate, formatNumber } from "@/ui/lib/format";

export const metadata = {
  title: "Admin overview",
  description: "Live review queues, campaign geography and reporting health in one workspace.",
};

export const dynamic = "force-dynamic";

function safe(value) {
  return JSON.parse(JSON.stringify(value));
}

export default async function AdminOverviewPage() {
  const cookieStore = await cookies();
  const token = parseSessionToken(cookieStore.toString());
  const admin = token ? await validateSession(token) : null;

  const canReadApplications = hasAdminPermission(admin, "application:read:all");
  const canReviewApplications = hasAdminPermission(admin, "application:review:all");
  const canManageAreas = hasAdminPermission(admin, "area:manage");
  const canReviewProposals =
    hasAdminPermission(admin, "proposal:review") || canManageAreas;
  const canReadReports =
    hasAdminPermission(admin, "invitation-report:read:all") || canManageAreas;

  let stats = null;
  let applications = [];
  let areas = [];
  let proposals = [];
  let reports = [];
  let dataError = null;

  try {
    const [statsResult, applicationsResult, areasResult, proposalsResult, reportsResult] =
      await Promise.all([
        canReadApplications ? getApplicationStats(admin) : Promise.resolve(null),
        canReadApplications
          ? listApplications(admin, { limit: 6, page: 1 })
          : Promise.resolve(null),
        canManageAreas ? listAdminAreas(admin) : Promise.resolve([]),
        canReviewProposals ? listProposals(admin) : Promise.resolve([]),
        canReadReports ? listReports(admin) : Promise.resolve([]),
      ]);
    stats = statsResult;
    applications = safe(applicationsResult?.applications ?? []);
    areas = safe(areasResult);
    proposals = safe(proposalsResult);
    reports = safe(reportsResult);
  } catch {
    dataError =
      "Live workspace data could not be loaded. No queue counts or campaign figures are being shown in their place.";
  }

  const pendingApplications = applications.filter((item) => item.status === "pending");
  const pendingProposals = proposals.filter((item) => item.status === "pending");
  const activeReports = reports.filter((item) => item.status === "active");
  const flaggedReports = reports.filter((item) => item.status === "flagged");
  const activeInvitations = activeReports.reduce(
    (sum, report) => sum + (Number(report.invitationCount) || 0),
    0,
  );
  const approvedAreas = areas.filter((area) => area.status === "approved");
  const areasWithPopulation = approvedAreas.filter(
    (area) => Number(area.populationEstimate) > 0,
  ).length;
  const areasWithGeometry = approvedAreas.filter(
    (area) => area.location?.coordinates || area.boundary?.coordinates,
  ).length;

  const permissions = Object.entries(ADMIN_PERMISSION_LABELS).filter(([permission]) =>
    hasAdminPermission(admin, permission),
  );

  const statCards = [
    canReadApplications
      ? {
          label: "Pending applications",
          value: dataError ? "—" : formatNumber(stats?.pending ?? 0),
          detail: canReviewApplications ? "Waiting for a decision" : "Read-only access",
        }
      : null,
    canReadApplications
      ? {
          label: "Active devotees",
          value: dataError ? "—" : formatNumber(stats?.activeDevotees ?? 0),
          detail: "Approved accounts that can report",
        }
      : null,
    canManageAreas
      ? {
          label: "Approved areas",
          value: dataError ? "—" : formatNumber(approvedAreas.length),
          detail: `${formatNumber(areasWithPopulation)} with population data`,
        }
      : null,
    canReadReports
      ? {
          label: "Active invitations",
          value: dataError ? "—" : formatNumber(activeInvitations),
          detail: `${formatNumber(activeReports.length)} active reports`,
        }
      : null,
    canReviewProposals
      ? {
          label: "Pending proposals",
          value: dataError ? "—" : formatNumber(pendingProposals.length),
          detail: "Never on the public map until approved",
        }
      : null,
  ].filter(Boolean);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Workspace overview"
        title="Good to see you, and thank you for reviewing."
        description="A live view of the queues, places and reports that keep the Mahotsav outreach trustworthy. Every number on this page comes directly from the campaign database."
        actions={
          <>
            <ButtonLink href="/" variant="secondary" size="sm">
              View public site
            </ButtonLink>
            {canManageAreas ? (
              <ButtonLink href="/admin/areas" size="sm">
                Manage areas <ArrowRight className="h-3.5 w-3.5" />
              </ButtonLink>
            ) : null}
          </>
        }
      />

      {dataError ? (
        <Notice tone="error" className="mb-5" title="Workspace data could not be loaded">
          {dataError} Reload the page to try again.
        </Notice>
      ) : null}

      {permissions.length === 0 && !isSuperAdmin(admin) ? (
        <Notice tone="warning" className="mb-5" title="No admin permissions assigned yet">
          Your account can open the workspace, but no review or geography permissions have been
          assigned. A Super Admin can add them from Accounts &amp; roles. Until then the API will
          correctly refuse privileged actions.
        </Notice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card, index) => (
          <Reveal key={card.label} delay={index * 0.05}>
            <StatCard {...card} />
          </Reveal>
        ))}
      </div>

      {(canReviewApplications && (stats?.pending ?? 0) > 0) || pendingProposals.length > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {canReviewApplications && (stats?.pending ?? 0) > 0 ? (
            <div className="border-saffron-200 bg-saffron-50/70 relative overflow-hidden rounded-2xl border p-5">
              <div className="pattern-jaali absolute inset-0 opacity-30" aria-hidden="true" />
              <div className="relative flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-saffron-800 text-[0.62rem] font-bold tracking-[0.14em] uppercase">
                    Review queue
                  </p>
                  <p className="text-bark-900 mt-2 text-lg font-semibold">
                    {formatNumber(stats.pending)}{" "}
                    {stats.pending === 1 ? "application is" : "applications are"} waiting.
                  </p>
                  <p className="text-ink-500 mt-1 text-[0.78rem]">
                    Every applicant deserves a personal decision.
                  </p>
                </div>
                <ButtonLink href="/admin/applications?status=pending" size="sm">
                  Open queue <ArrowRight className="h-3.5 w-3.5" />
                </ButtonLink>
              </div>
            </div>
          ) : null}

          {pendingProposals.length > 0 ? (
            <div className="border-line relative overflow-hidden rounded-2xl border bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-gold-700 text-[0.62rem] font-bold tracking-[0.14em] uppercase">
                    Locality proposals
                  </p>
                  <p className="text-bark-900 mt-2 text-lg font-semibold">
                    {formatNumber(pendingProposals.length)}{" "}
                    {pendingProposals.length === 1 ? "proposal needs" : "proposals need"} a decision.
                  </p>
                  <p className="text-ink-500 mt-1 text-[0.78rem]">
                    Pending proposals do not appear on the map or change totals.
                  </p>
                </div>
                <ButtonLink href="/admin/proposals" variant="secondary" size="sm">
                  Review proposals <ArrowRight className="h-3.5 w-3.5" />
                </ButtonLink>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          {canReadApplications ? (
            <section className="table-shell">
              <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b bg-cream/50 px-4 py-3.5 sm:px-5">
                <div>
                  <h2 className="text-bark-900 text-base font-semibold">Recent applications</h2>
                  <p className="text-ink-400 mt-0.5 text-[0.7rem]">
                    Newest first. Internal notes are never listed in the queue.
                  </p>
                </div>
                <Link
                  href="/admin/applications"
                  className="text-saffron-700 hover:text-saffron-800 inline-flex items-center gap-1 text-[0.74rem] font-semibold"
                >
                  All applications <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {applications.length === 0 ? (
                <EmptyState
                  icon="people"
                  className="border-0 shadow-none"
                  title="No applications yet"
                  description="Applications appear here as soon as someone applies. No test or invented records are shown."
                />
              ) : (
                <ul className="divide-line divide-y">
                  {applications.map((application) => (
                    <li key={application.id} className="hover:bg-cream/40 transition-colors">
                      <Link
                        href={`/admin/applications/${application.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
                      >
                        <div className="min-w-0">
                          <p className="text-bark-900 truncate text-sm font-semibold">
                            {application.applicantName}
                          </p>
                          <p className="text-ink-400 mt-0.5 truncate text-[0.7rem]">
                            {application.applicantEmail} · Applied{" "}
                            {formatDate(application.createdAt)}
                          </p>
                        </div>
                        <StatusBadge status={application.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {canReadReports ? (
            <section className="table-shell">
              <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b bg-cream/50 px-4 py-3.5 sm:px-5">
                <div>
                  <h2 className="text-bark-900 text-base font-semibold">Reporting health</h2>
                  <p className="text-ink-400 mt-0.5 text-[0.7rem]">
                    Active reports count toward coverage; flagged reports do not.
                  </p>
                </div>
                <Link
                  href="/admin/invitations"
                  className="text-saffron-700 hover:text-saffron-800 inline-flex items-center gap-1 text-[0.74rem] font-semibold"
                >
                  All reports <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid gap-px bg-line sm:grid-cols-3">
                {[
                  { label: "Active", value: activeReports.length, tone: "green" },
                  { label: "Flagged", value: flaggedReports.length, tone: "amber" },
                  {
                    label: "Invalid",
                    value: reports.filter((item) => item.status === "invalid").length,
                    tone: "red",
                  },
                ].map((item) => (
                  <div key={item.label} className="bg-white px-5 py-4">
                    <Badge tone={item.tone}>{item.label}</Badge>
                    <p className="text-bark-900 font-display mt-3 text-2xl font-semibold tabular-nums">
                      {dataError ? "—" : formatNumber(item.value)}
                    </p>
                  </div>
                ))}
              </div>
              {activeReports.length > 0 ? (
                <div className="border-line border-t px-4 py-3.5 sm:px-5">
                  <p className="text-ink-400 text-[0.68rem] font-bold tracking-[0.12em] uppercase">
                    Latest active reports
                  </p>
                  <ul className="mt-2.5 space-y-2">
                    {activeReports.slice(0, 3).map((report) => (
                      <li
                        key={report._id}
                        className="text-ink-600 flex items-baseline justify-between gap-3 text-[0.78rem]"
                      >
                        <span className="truncate">
                          {report.areaId?.name ?? "Area unavailable"}
                          <span className="text-ink-400">
                            {" "}
                            · {report.contributorId?.fullName ?? "Contributor"}
                          </span>
                        </span>
                        <span className="text-bark-900 shrink-0 font-semibold tabular-nums">
                          +{formatNumber(report.invitationCount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          {!canReadApplications && !canReadReports && !canManageAreas ? (
            <EmptyState
              icon="search"
              title="Your workspace is ready for permissions"
              description="Ask a Super Admin to assign the review, geography or reporting permissions you need. The public site remains available in the meantime."
              action={
                <ButtonLink href="/" variant="secondary">
                  Open the public site
                </ButtonLink>
              }
            />
          ) : null}
        </div>

        <aside className="space-y-5">
          {canManageAreas ? (
            <section className="card-warm p-5">
              <h2 className="text-bark-900 text-base font-semibold">Campaign geography</h2>
              <p className="text-ink-400 mt-1 text-[0.72rem] leading-relaxed">
                Public map health at a glance.
              </p>
              <dl className="divide-line mt-4 divide-y text-sm">
                {[
                  ["Approved areas", approvedAreas.length],
                  ["Archived areas", areas.length - approvedAreas.length],
                  ["With population data", areasWithPopulation],
                  ["With recorded geometry", areasWithGeometry],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0">
                    <dt className="text-ink-500 text-[0.76rem]">{label}</dt>
                    <dd className="text-bark-900 text-[0.82rem] font-semibold tabular-nums">
                      {dataError ? "—" : formatNumber(value)}
                    </dd>
                  </div>
                ))}
              </dl>
              {approvedAreas.length - areasWithGeometry > 0 ? (
                <p className="text-ink-400 mt-3 text-[0.68rem] leading-relaxed">
                  {approvedAreas.length - areasWithGeometry} approved{" "}
                  {approvedAreas.length - areasWithGeometry === 1 ? "area has" : "areas have"} no
                  recorded coordinates. They are listed but never placed by guesswork.
                </p>
              ) : null}
              <ButtonLink href="/admin/areas" variant="secondary" size="sm" className="mt-4 w-full">
                Manage areas
              </ButtonLink>
            </section>
          ) : null}

          <section className="card-warm p-5">
            <h2 className="text-bark-900 text-base font-semibold">Your permissions</h2>
            <p className="text-ink-400 mt-1 text-[0.72rem] leading-relaxed">
              The server enforces these on every request.
            </p>
            {isSuperAdmin(admin) ? (
              <div className="mt-4">
                <Badge tone="gold">Super Admin · all capabilities</Badge>
                <p className="text-ink-500 mt-3 text-[0.74rem] leading-relaxed">
                  Account creation and the audit log are reserved to this role and are listed under
                  the Super Admin section.
                </p>
              </div>
            ) : permissions.length === 0 ? (
              <p className="text-ink-400 mt-4 text-[0.78rem] leading-relaxed">
                No granular permissions assigned.
              </p>
            ) : (
              <ul className="mt-4 flex flex-wrap gap-2">
                {permissions.map(([permission, label]) => (
                  <li key={permission}>
                    <Badge tone="neutral">{label}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="bg-bark-950 text-ivory relative overflow-hidden rounded-2xl p-5">
            <div className="pattern-jaali absolute inset-0 opacity-[0.14]" aria-hidden="true" />
            <div className="relative">
              <p className="text-[0.6rem] font-bold tracking-[0.16em] text-gold-300 uppercase">
                A note on care
              </p>
              <p className="text-ivory/65 mt-2 text-[0.8rem] leading-[1.7]">
                Review decisions affect real people. Rejections require an internal reason, invalid
                reports require an audit note, and applicant notes are never published.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
