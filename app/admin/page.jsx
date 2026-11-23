import Link from "next/link";
import { cookies } from "next/headers";
import { parseSessionToken } from "@/api/lib/auth/session";
import { validateSession } from "@/api/services/auth-service";
import {
  getApplicationStats,
  getDevoteeStats,
  listApplications,
} from "@/api/services/admin-service";
import { listAdminAreas } from "@/api/services/area-service";
import { listProposals } from "@/api/services/proposal-service";
import { listReports, getCoverageAnalytics } from "@/api/services/invitation-service";
import { AuditLog } from "@/api/models/audit-log";
import { connectToDatabase } from "@/api/lib/mongodb/connection";
import { hasAdminPermission, isSuperAdmin } from "@/ui/lib/admin-navigation";
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
  const canReviewProposals = hasAdminPermission(admin, "proposal:review");
  const canReadReports = hasAdminPermission(admin, "invitation-report:read:all");
  const canReadDevotees = hasAdminPermission(admin, "devotee:read:all");
  const canReadAudit = hasAdminPermission(admin, "audit:read:all");
  const canViewAnalytics = canManageAreas || canReadReports;

  let stats = null;
  let devoteeStats = null;
  let applications = [];
  let areas = [];
  let proposals = [];
  let reports = [];
  let coverage = [];
  let recentActivity = [];
  let dataError = null;

  try {
    const [
      statsResult,
      devoteeStatsResult,
      applicationsResult,
      areasResult,
      proposalsResult,
      reportsResult,
      coverageResult,
    ] = await Promise.all([
      canReadApplications ? getApplicationStats(admin) : Promise.resolve(null),
      canReadDevotees ? getDevoteeStats(admin) : Promise.resolve(null),
      canReadApplications ? listApplications(admin, { limit: 6, page: 1 }) : Promise.resolve(null),
      canManageAreas ? listAdminAreas(admin) : Promise.resolve([]),
      canReviewProposals ? listProposals(admin) : Promise.resolve([]),
      canReadReports ? listReports(admin) : Promise.resolve([]),
      canViewAnalytics ? getCoverageAnalytics() : Promise.resolve([]),
    ]);
    stats = statsResult;
    devoteeStats = devoteeStatsResult;
    applications = safe(applicationsResult?.applications ?? []);
    areas = safe(areasResult);
    proposals = safe(proposalsResult);
    reports = safe(reportsResult);
    coverage = safe(coverageResult);

    if (canReadAudit) {
      await connectToDatabase();
      recentActivity = safe(
        await AuditLog.find({})
          .select("eventType actorId actorRole targetType createdAt")
          .populate("actorId", "fullName role")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      );
    }
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
    canReadDevotees
      ? {
          label: "Active devotees",
          value: dataError ? "—" : formatNumber(devoteeStats?.activeDevotees ?? 0),
          detail: "Approved accounts that can report",
        }
      : null,
    canReadDevotees
      ? {
          label: "Suspended devotees",
          value: dataError ? "—" : formatNumber(devoteeStats?.suspendedDevotees ?? 0),
          detail: "Access currently blocked",
        }
      : null,
    canViewAnalytics
      ? {
          label: "Areas with coverage data",
          value: dataError
            ? "—"
            : formatNumber(
                coverage.filter(
                  (entry) =>
                    entry.coveragePercentage !== null && entry.coveragePercentage !== undefined,
                ).length,
              ),
          detail: "Known population estimates",
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, index) => (
          <Reveal key={card.label} delay={index * 0.05}>
            <StatCard {...card} />
          </Reveal>
        ))}
      </div>

      <section className="mt-5 rounded-2xl border border-line bg-white p-5">
        <h2 className="text-base font-semibold text-bark-900">Workspace sections</h2>
        <p className="mt-1 text-[0.74rem] text-ink-400">
          Every link is permission-checked again on the target page and API.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            canReadDevotees ? { href: "/admin/devotees", label: "Open devotee directory" } : null,
            canReadApplications
              ? { href: "/admin/applications", label: "Review applications" }
              : null,
            canReadReports
              ? { href: "/admin/invitations", label: "Open invitation reports" }
              : null,
            canManageAreas ? { href: "/admin/areas", label: "Open areas & boundaries" } : null,
            canManageAreas ? { href: "/admin/population", label: "Manage population" } : null,
            canReviewProposals ? { href: "/admin/proposals", label: "Review proposals" } : null,
            canViewAnalytics
              ? { href: "/admin/analytics", label: "Open campaign analytics" }
              : null,
            canReadAudit ? { href: "/admin/audit", label: "Review audit history" } : null,
          ]
            .filter(Boolean)
            .map((link) => (
              <ButtonLink key={link.href} href={link.href} size="sm" variant="secondary">
                {link.label}
              </ButtonLink>
            ))}
        </div>
      </section>

      {canReadAudit && recentActivity.length > 0 ? (
        <section className="table-shell mt-5">
          <div className="border-b border-line bg-cream/50 px-4 py-3.5 sm:px-5">
            <h2 className="text-base font-semibold text-bark-900">Recent activity</h2>
            <p className="mt-0.5 text-[0.7rem] text-ink-400">
              Latest audited actions across the workspace.
            </p>
          </div>
          <ul className="divide-y divide-line">
            {recentActivity.map((event) => (
              <li
                key={event._id?.toString?.() ?? String(event._id)}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
              >
                <div>
                  <p className="text-sm font-semibold text-bark-900">{event.eventType}</p>
                  <p className="text-[0.72rem] text-ink-400">
                    {event.actorId?.fullName ?? event.actorRole ?? "system"} ·{" "}
                    {event.targetType ?? "—"}
                  </p>
                </div>
                <p className="text-[0.72rem] text-ink-400">{formatDate(event.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(canReviewApplications && (stats?.pending ?? 0) > 0) || pendingProposals.length > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {canReviewApplications && (stats?.pending ?? 0) > 0 ? (
            <div className="relative overflow-hidden rounded-2xl border border-saffron-200 bg-saffron-50/70 p-5">
              <div className="pattern-jaali absolute inset-0 opacity-30" aria-hidden="true" />
              <div className="relative flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[0.62rem] font-bold tracking-[0.14em] text-saffron-800 uppercase">
                    Review queue
                  </p>
                  <p className="mt-2 text-lg font-semibold text-bark-900">
                    {formatNumber(stats.pending)}{" "}
                    {stats.pending === 1 ? "application is" : "applications are"} waiting.
                  </p>
                  <p className="mt-1 text-[0.78rem] text-ink-500">
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
            <div className="relative overflow-hidden rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[0.62rem] font-bold tracking-[0.14em] text-gold-700 uppercase">
                    Locality proposals
                  </p>
                  <p className="mt-2 text-lg font-semibold text-bark-900">
                    {formatNumber(pendingProposals.length)}{" "}
                    {pendingProposals.length === 1 ? "proposal needs" : "proposals need"} a
                    decision.
                  </p>
                  <p className="mt-1 text-[0.78rem] text-ink-500">
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
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-cream/50 px-4 py-3.5 sm:px-5">
                <div>
                  <h2 className="text-base font-semibold text-bark-900">Recent applications</h2>
                  <p className="mt-0.5 text-[0.7rem] text-ink-400">
                    Newest first. Internal notes are never listed in the queue.
                  </p>
                </div>
                <Link
                  href="/admin/applications"
                  className="inline-flex items-center gap-1 text-[0.74rem] font-semibold text-saffron-700 hover:text-saffron-800"
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
                <ul className="divide-y divide-line">
                  {applications.map((application) => (
                    <li key={application._id} className="transition-colors hover:bg-cream/40">
                      <Link
                        href={`/admin/applications/${application._id}`}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-bark-900">
                            {application.applicantName}
                          </p>
                          <p className="mt-0.5 truncate text-[0.7rem] text-ink-400">
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
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-cream/50 px-4 py-3.5 sm:px-5">
                <div>
                  <h2 className="text-base font-semibold text-bark-900">Reporting health</h2>
                  <p className="mt-0.5 text-[0.7rem] text-ink-400">
                    Active reports count toward coverage; flagged reports do not.
                  </p>
                </div>
                <Link
                  href="/admin/invitations"
                  className="inline-flex items-center gap-1 text-[0.74rem] font-semibold text-saffron-700 hover:text-saffron-800"
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
                    <p className="mt-3 font-display text-2xl font-semibold text-bark-900 tabular-nums">
                      {dataError ? "—" : formatNumber(item.value)}
                    </p>
                  </div>
                ))}
              </div>
              {activeReports.length > 0 ? (
                <div className="border-t border-line px-4 py-3.5 sm:px-5">
                  <p className="text-[0.68rem] font-bold tracking-[0.12em] text-ink-400 uppercase">
                    Latest active reports
                  </p>
                  <ul className="mt-2.5 space-y-2">
                    {activeReports.slice(0, 3).map((report) => (
                      <li
                        key={report._id}
                        className="flex items-baseline justify-between gap-3 text-[0.78rem] text-ink-600"
                      >
                        <span className="truncate">
                          {report.areaId?.name ?? "Area unavailable"}
                          <span className="text-ink-400">
                            {" "}
                            · {report.contributorId?.fullName ?? "Contributor"}
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold text-bark-900 tabular-nums">
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
              <h2 className="text-base font-semibold text-bark-900">Campaign geography</h2>
              <p className="mt-1 text-[0.72rem] leading-relaxed text-ink-400">
                Public map health at a glance.
              </p>
              <dl className="mt-4 divide-y divide-line text-sm">
                {[
                  ["Approved areas", approvedAreas.length],
                  ["Archived areas", areas.length - approvedAreas.length],
                  ["With population data", areasWithPopulation],
                  ["With recorded geometry", areasWithGeometry],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0"
                  >
                    <dt className="text-[0.76rem] text-ink-500">{label}</dt>
                    <dd className="text-[0.82rem] font-semibold text-bark-900 tabular-nums">
                      {dataError ? "—" : formatNumber(value)}
                    </dd>
                  </div>
                ))}
              </dl>
              {approvedAreas.length - areasWithGeometry > 0 ? (
                <p className="mt-3 text-[0.68rem] leading-relaxed text-ink-400">
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
            <h2 className="text-base font-semibold text-bark-900">Your permissions</h2>
            <p className="mt-1 text-[0.72rem] leading-relaxed text-ink-400">
              The server enforces these on every request.
            </p>
            {isSuperAdmin(admin) ? (
              <div className="mt-4">
                <Badge tone="gold">Super Admin · all capabilities</Badge>
                <p className="mt-3 text-[0.74rem] leading-relaxed text-ink-500">
                  Account creation and the audit log are reserved to this role and are listed under
                  the Super Admin section.
                </p>
              </div>
            ) : permissions.length === 0 ? (
              <p className="mt-4 text-[0.78rem] leading-relaxed text-ink-400">
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

          <div className="relative overflow-hidden rounded-2xl bg-bark-950 p-5 text-ivory">
            <div className="pattern-jaali absolute inset-0 opacity-[0.14]" aria-hidden="true" />
            <div className="relative">
              <p className="text-[0.6rem] font-bold tracking-[0.16em] text-gold-300 uppercase">
                A note on care
              </p>
              <p className="mt-2 text-[0.8rem] leading-[1.7] text-ivory/65">
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
