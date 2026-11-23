import { cookies } from "next/headers";
import { parseSessionToken } from "@/api/lib/auth/session";
import { validateSession } from "@/api/services/auth-service";
import { getCoverageAnalytics, listReports } from "@/api/services/invitation-service";
import { listAdminAreas } from "@/api/services/area-service";
import { hasAdminPermission } from "@/ui/lib/admin-navigation";
import AdminDenied from "@/ui/components/admin/AdminDenied";
import AdminPageHeader from "@/ui/components/admin/AdminPageHeader";
import Notice from "@/ui/components/ui/Notice";
import EmptyState from "@/ui/components/ui/EmptyState";
import StatCard from "@/ui/components/ui/StatCard";
import CoverageBar from "@/ui/components/ui/CoverageBar";
import { formatNumber } from "@/ui/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Campaign analytics",
  description: "Approved campaign aggregates and reported invitation coverage.",
};

const plain = (value) => JSON.parse(JSON.stringify(value));

export default async function AdminAnalyticsPage() {
  const cookieStore = await cookies();
  const token = parseSessionToken(cookieStore.toString());
  const admin = token ? await validateSession(token) : null;

  const mayViewAnalytics =
    Boolean(admin) &&
    (hasAdminPermission(admin, "area:manage") ||
      hasAdminPermission(admin, "invitation-report:read:all"));
  if (!mayViewAnalytics) {
    return (
      <AdminDenied
        title="Campaign analytics access denied"
        permission="invitation-report:read:all"
      />
    );
  }

  let analytics = [];
  let reports = [];
  let areas = [];
  let unavailable = false;
  try {
    const [coverage, reportRecords, areaRecords] = await Promise.all([
      getCoverageAnalytics(),
      hasAdminPermission(admin, "invitation-report:read:all")
        ? listReports(admin)
        : Promise.resolve([]),
      hasAdminPermission(admin, "area:manage") ? listAdminAreas(admin) : Promise.resolve([]),
    ]);
    analytics = plain(coverage);
    reports = plain(reportRecords);
    areas = plain(areaRecords).filter((area) => area.status === "approved");
  } catch {
    unavailable = true;
  }

  const directInvitations = analytics.reduce(
    (sum, entry) => sum + (entry.directInvitationCount ?? 0),
    0,
  );
  const withPopulation = analytics.filter(
    (entry) => entry.populationEstimate !== null && entry.populationEstimate !== undefined,
  ).length;
  const flagged = reports.filter((report) => report.status === "flagged").length;
  const invalid = reports.filter((report) => report.status === "invalid").length;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Campaign analytics"
        title="Coverage across the campaign."
        description="Approved aggregates only. Coverage is reported invitations divided by estimated population — not unique people reached. Pending proposals and invalidated reports never affect these figures."
      />

      {unavailable ? (
        <Notice tone="error" title="Analytics unavailable">
          Approved campaign data could not be loaded. No substitute figures are displayed.
        </Notice>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Approved areas"
              value={formatNumber(areas.length)}
              detail="Official geography only"
            />
            <StatCard
              label="Invitations reported"
              value={formatNumber(directInvitations)}
              detail="Direct reports, counted once"
            />
            <StatCard
              label="With population data"
              value={formatNumber(withPopulation)}
              detail="Coverage can be calculated"
            />
            {hasAdminPermission(admin, "invitation-report:read:all") ? (
              <StatCard
                label="Reports needing attention"
                value={formatNumber(flagged + invalid)}
                detail={`${flagged} flagged · ${invalid} invalid`}
              />
            ) : null}
          </div>

          {analytics.length === 0 ? (
            <EmptyState
              icon="map"
              className="mt-6"
              title="No approved areas yet"
              description="Coverage appears after administrators publish campaign areas."
            />
          ) : (
            <section className="table-shell mt-6">
              <div className="border-b border-line bg-cream/50 px-4 py-3.5 sm:px-5">
                <h2 className="text-base font-semibold text-bark-900">
                  Reported invitation coverage
                </h2>
                <p className="mt-0.5 text-[0.7rem] text-ink-400">
                  Missing population reads as unavailable; values above 100% are flagged, not
                  capped.
                </p>
              </div>
              <ul className="divide-y divide-line">
                {analytics.map((entry) => (
                  <li
                    key={entry.areaId}
                    className="grid gap-4 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-bark-900">{entry.name}</p>
                      <p className="mt-0.5 text-[0.72rem] text-ink-400">{entry.type || "Area"}</p>
                      <p className="mt-2 text-[0.78rem] text-ink-600">
                        Population:{" "}
                        {entry.populationEstimate === null || entry.populationEstimate === undefined
                          ? "Not recorded"
                          : formatNumber(entry.populationEstimate)}
                      </p>
                      <p className="text-[0.78rem] text-ink-600">
                        Contributors: {formatNumber(entry.contributorCount ?? 0)}
                      </p>
                    </div>
                    <CoverageBar
                      percentage={entry.coveragePercentage}
                      status={entry.coverageStatus}
                      label="Reported invitation coverage"
                      compact
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
