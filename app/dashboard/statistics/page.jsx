import { requireActiveDevoteePage } from "@/app/_lib/devotee-page";
import { getCoverageAnalytics } from "@/api/services/invitation-service";
import PageHero from "@/ui/components/ui/PageHero";
import CampaignPulse from "@/ui/components/home/CampaignPulse";
import CoverageBar from "@/ui/components/ui/CoverageBar";
import Notice from "@/ui/components/ui/Notice";
import EmptyState from "@/ui/components/ui/EmptyState";
import { formatNumber } from "@/ui/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Campaign statistics — Devotee portal",
  description: "Approved aggregate campaign figures and invitation coverage.",
};

export default async function StatisticsPage() {
  await requireActiveDevoteePage();

  let analytics = [];
  let unavailable = false;
  try {
    analytics = JSON.parse(JSON.stringify(await getCoverageAnalytics()));
  } catch {
    unavailable = true;
  }

  return (
    <>
      <PageHero
        eyebrow="Devotee portal"
        title="How the campaign is taking shape."
        description="Aggregate figures across approved areas only. Every number is labelled: population estimates are not the same as reported invitations, and pending proposals or invalidated reports never change these totals."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Devotee portal", href: "/dashboard" },
          { label: "Campaign statistics" },
        ]}
      />

      <div className="shell space-y-8 py-8 sm:py-10">
        <CampaignPulse />

        {unavailable ? (
          <Notice tone="error" title="Statistics temporarily unavailable">
            Approved campaign figures could not be loaded. No substitute numbers are displayed.
          </Notice>
        ) : null}

        {!unavailable && analytics.length === 0 ? (
          <EmptyState
            icon="map"
            title="No approved areas yet"
            description="Coverage appears here once administrators publish campaign areas. Nothing is estimated."
          />
        ) : null}

        {!unavailable && analytics.length > 0 ? (
          <section className="table-shell">
            <div className="border-b border-line bg-cream/50 px-4 py-3.5 sm:px-5">
              <h2 className="text-base font-semibold text-bark-900">Coverage by approved area</h2>
              <p className="mt-0.5 text-[0.7rem] text-ink-400">
                Coverage = reported invitations ÷ estimated population. No population recorded means
                unavailable, not zero. Values above 100% are flagged, never capped.
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
                    <p className="mt-0.5 text-[0.72rem] text-ink-400">
                      {entry.type || "Area"}
                      {entry.code ? ` · ${entry.code}` : ""}
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-[0.72rem] text-ink-500 sm:grid-cols-3">
                      <div>
                        <dt className="font-semibold text-bark-900">Population estimate</dt>
                        <dd>
                          {entry.populationEstimate === null ||
                          entry.populationEstimate === undefined
                            ? "Not recorded"
                            : formatNumber(entry.populationEstimate)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-bark-900">Invitations reported</dt>
                        <dd>{formatNumber(entry.directInvitationCount ?? 0)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-bark-900">Contributors</dt>
                        <dd>{formatNumber(entry.contributorCount ?? 0)}</dd>
                      </div>
                    </dl>
                  </div>
                  <CoverageBar
                    percentage={entry.coveragePercentage}
                    status={entry.coverageStatus}
                    label="Invitation coverage"
                    compact
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
