"use client";

import Link from "next/link";
import Badge from "@/ui/components/ui/Badge";
import CoverageBar from "@/ui/components/ui/CoverageBar";
import { ArrowRight } from "@/ui/components/ui/Button";
import { formatNumber } from "@/ui/lib/format";

function Stat({ label, value, note }) {
  return (
    <div className="rounded-xl border border-line bg-cream/60 px-3.5 py-3">
      <p className="text-ink-400 text-[0.6rem] font-bold tracking-[0.12em] uppercase">{label}</p>
      <p className="text-bark-900 mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {note ? <p className="text-ink-400 mt-0.5 text-[0.62rem] leading-relaxed">{note}</p> : null}
    </div>
  );
}

/**
 * Public details for one approved locality. The panel consumes the same
 * aggregate analytics as the map, so a parent and its children are counted
 * exactly once, and a missing population estimate is never displayed as zero.
 */
export default function AreaDetailsPanel({
  area,
  analytics,
  childAreas = [],
  isAdmin = false,
  onClose,
  onSelect,
}) {
  if (!area) return null;

  const parentName =
    typeof area.parentId === "object" && area.parentId ? area.parentId.name : null;
  const coverage = analytics?.coveragePercentage ?? null;
  const coverageStatus = analytics?.coverageStatus ?? "unavailable";
  const total = analytics?.totalInvitations ?? null;
  const direct = analytics?.directInvitationCount ?? null;
  const reportCount = analytics?.reportCount ?? null;
  const contributorCount = analytics?.contributorCount ?? null;

  return (
    <div className="card-paper overflow-hidden">
      <div className="bg-bark-950 text-ivory relative overflow-hidden px-5 py-5">
        <div className="pattern-jaali absolute inset-0 opacity-[0.13]" aria-hidden="true" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="dark">{area.type || "Locality"}</Badge>
                {area.code ? (
                  <span className="text-ivory/45 font-mono text-[0.64rem] tracking-[0.08em] uppercase">
                    {area.code}
                  </span>
                ) : null}
              </div>
              <h2 className="mt-3 text-2xl leading-tight font-semibold tracking-[-0.03em] break-words">
                {area.name}
              </h2>
              <p className="text-ivory/50 mt-1.5 text-[0.72rem]">
                {parentName ? `Part of ${parentName}` : "Top-level approved area"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close area details"
              className="text-ivory/55 hover:bg-white/10 hover:text-ivory -mr-1 shrink-0 rounded-full p-2 transition-colors"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="none">
                <path
                  d="m5 5 10 10M15 5 5 15"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-5">
        <CoverageBar
          percentage={coverage}
          status={coverageStatus}
          label="Invitation coverage"
        />

        <div className="grid grid-cols-2 gap-2.5">
          <Stat
            label="Invitations"
            value={total === null ? "—" : formatNumber(total)}
            note="Area + approved children"
          />
          <Stat
            label="Reported here"
            value={direct === null ? "—" : formatNumber(direct)}
            note="Directly in this area"
          />
          <Stat
            label="Reports"
            value={reportCount === null ? "—" : formatNumber(reportCount)}
            note="Each report counted once"
          />
          <Stat
            label="Contributors"
            value={contributorCount === null ? "—" : formatNumber(contributorCount)}
            note="Identities stay private"
          />
        </div>

        <dl className="divide-line divide-y text-sm">
          <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0">
            <dt className="text-ink-400 text-[0.66rem] font-bold tracking-[0.1em] uppercase">
              Population estimate
            </dt>
            <dd className="text-bark-900 text-right text-sm font-semibold">
              {typeof analytics?.populationEstimate === "number"
                ? formatNumber(analytics.populationEstimate)
                : "Not recorded"}
            </dd>
          </div>
          {area.formattedAddress ? (
            <div className="flex items-start justify-between gap-4 py-2.5">
              <dt className="text-ink-400 text-[0.66rem] font-bold tracking-[0.1em] uppercase">
                Address
              </dt>
              <dd className="text-ink-600 max-w-[62%] text-right text-[0.8rem] leading-relaxed">
                {area.formattedAddress}
              </dd>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="text-ink-400 text-[0.66rem] font-bold tracking-[0.1em] uppercase">
              Boundary
            </dt>
            <dd className="text-ink-600 text-right text-[0.78rem]">
              {area.boundary?.coordinates
                ? `Recorded ${area.boundary.type}`
                : area.location?.coordinates
                  ? "Point recorded"
                  : "No geometry recorded"}
            </dd>
          </div>
          {area.ancestorIds?.length ? (
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-ink-400 text-[0.66rem] font-bold tracking-[0.1em] uppercase">
                Hierarchy depth
              </dt>
              <dd className="text-ink-600 text-right text-[0.78rem]">
                {area.ancestorIds.length + 1} levels
              </dd>
            </div>
          ) : null}
        </dl>

        {childAreas.length > 0 ? (
          <div>
            <p className="text-ink-400 text-[0.64rem] font-bold tracking-[0.12em] uppercase">
              Approved child areas ({childAreas.length})
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {childAreas.map((child) => (
                <button
                  key={child._id}
                  type="button"
                  onClick={() => onSelect?.(child._id)}
                  className="border-line text-ink-600 hover:border-gold-400 hover:text-bark-900 rounded-full border bg-white px-3 py-1 text-[0.72rem] font-semibold transition-colors"
                >
                  {child.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl bg-cream px-4 py-3.5">
          <p className="text-ink-500 text-[0.7rem] leading-relaxed">
            Public figures aggregate active reports only. Pending proposals, flagged reports and
            invalid reports never contribute. Contributor names are not published.
          </p>
        </div>

        {isAdmin ? (
          <Link
            href={`/admin/areas?focus=${area._id}`}
            className="border-line text-bark-900 hover:border-gold-400 inline-flex w-full items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            Manage this area in the admin workspace
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
