import { requireActiveDevoteePage } from "@/app/_lib/devotee-page";
import { listReports } from "@/api/services/invitation-service";
import { listProposals } from "@/api/services/proposal-service";
import PageHero from "@/ui/components/ui/PageHero";
import Notice from "@/ui/components/ui/Notice";
import EmptyState from "@/ui/components/ui/EmptyState";
import Badge, { StatusBadge } from "@/ui/components/ui/Badge";
import { formatDate, formatNumber } from "@/ui/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My contributions — Devotee portal",
  description: "Your own invitation reports and locality proposals.",
};

export default async function ContributionsPage() {
  const user = await requireActiveDevoteePage();

  let reports = [];
  let proposals = [];
  let unavailable = false;
  try {
    const [reportRecords, proposalRecords] = await Promise.all([
      listReports(user),
      listProposals(user),
    ]);
    reports = JSON.parse(JSON.stringify(reportRecords));
    proposals = JSON.parse(JSON.stringify(proposalRecords));
  } catch {
    unavailable = true;
  }

  const active = reports.filter((report) => report.status === "active");
  const invitations = active.reduce(
    (sum, report) => sum + (Number(report.invitationCount) || 0),
    0,
  );
  const areaIds = new Set(
    active
      .map((report) => {
        const area = report.areaId;
        if (!area) return null;
        return typeof area === "object" ? (area._id ?? area.id) : area;
      })
      .filter(Boolean),
  );

  return (
    <>
      <PageHero
        eyebrow="Devotee portal"
        title="What you have contributed."
        description="A private summary of the invitations you recorded and the localities you proposed. Nothing here is a leaderboard, and no other contributor's identity is included."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Devotee portal", href: "/dashboard" },
          { label: "My contributions" },
        ]}
      />
      <div className="shell space-y-8 py-8 sm:py-10">
        {unavailable ? (
          <Notice tone="error" title="Contribution data unavailable">
            Your contribution records could not be loaded. No substitute figures are shown.
          </Notice>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Invitations you recorded",
                  value: formatNumber(invitations),
                  detail: "Active reports only",
                },
                {
                  label: "Localities reached",
                  value: formatNumber(areaIds.size),
                  detail: "Distinct approved areas",
                },
                {
                  label: "Proposals shared",
                  value: formatNumber(proposals.length),
                  detail: "Pending proposals do not change the map",
                },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-line bg-white p-5">
                  <p className="text-[0.64rem] font-bold tracking-[0.12em] text-ink-400 uppercase">
                    {item.label}
                  </p>
                  <p className="mt-2 font-display text-3xl font-semibold text-bark-900">
                    {item.value}
                  </p>
                  <p className="mt-1 text-[0.7rem] text-ink-400">{item.detail}</p>
                </div>
              ))}
            </section>

            <section className="table-shell">
              <div className="border-b border-line bg-cream/50 px-4 py-3.5 sm:px-5">
                <h2 className="text-base font-semibold text-bark-900">Localities you proposed</h2>
                <p className="mt-0.5 text-[0.7rem] text-ink-400">
                  Proposals are reviewed before they can become official areas.
                </p>
              </div>
              {proposals.length === 0 ? (
                <EmptyState
                  icon="map"
                  title="No proposals yet"
                  description="When you propose a locality from the dashboard, it appears here with its review status."
                />
              ) : (
                <ul className="divide-y divide-line">
                  {proposals.map((proposal) => (
                    <li
                      key={proposal._id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5"
                    >
                      <div>
                        <p className="text-sm font-semibold text-bark-900">{proposal.name}</p>
                        <p className="mt-0.5 text-[0.72rem] text-ink-400">
                          {proposal.type || "Locality"}
                          {proposal.createdAt
                            ? ` · proposed ${formatDate(proposal.createdAt)}`
                            : ""}
                        </p>
                        {proposal.status === "needs_correction" && proposal.correctionNotes ? (
                          <p className="mt-1 text-[0.72rem] text-gold-800">
                            Correction requested: {proposal.correctionNotes}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={proposal.status} />
                        {proposal.parentId && typeof proposal.parentId === "object" ? (
                          <Badge tone="neutral">{proposal.parentId.name}</Badge>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
