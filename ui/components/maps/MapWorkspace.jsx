"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import Tabs from "@/ui/components/ui/Tabs";
import Notice from "@/ui/components/ui/Notice";
import EmptyState from "@/ui/components/ui/EmptyState";
import { Button, ButtonLink, ArrowRight } from "@/ui/components/ui/Button";
import { useSession } from "@/ui/components/providers/SessionProvider";
import SvgAtlas from "./SvgAtlas";
import GoogleMapCanvas from "./GoogleMapCanvas";
import AreaDetailsPanel from "./AreaDetailsPanel";
import ProposeAreaModal from "./ProposeAreaModal";
import { apiFetch } from "@/ui/lib/api-client";
import { formatNumber } from "@/ui/lib/format";
import { cn } from "@/ui/lib/cn";
import { VENUE_DIRECTIONS_URL, VENUE_SHORT_URL } from "@/ui/lib/venue";

function Metric({ label, value, note, loading = false }) {
  return (
    <div className="border-b border-line py-4 last:border-b-0 sm:border-r sm:border-b-0 sm:px-5 sm:py-0 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0">
      <p className="text-[0.62rem] font-bold tracking-[0.14em] text-ink-400 uppercase">{label}</p>
      {loading ? (
        <div className="skeleton mt-2 h-7 w-16 rounded-lg" />
      ) : (
        <p className="mt-1.5 font-display text-[1.7rem] leading-none font-semibold tracking-[-0.03em] text-bark-900">
          {value}
        </p>
      )}
      <p className="mt-1 text-[0.66rem] leading-relaxed text-ink-400">{note}</p>
    </div>
  );
}

function CoverageMini({ analytics }) {
  if (analytics?.coveragePercentage === null || analytics?.coveragePercentage === undefined) {
    return <span className="text-[0.7rem] text-ink-400">Unavailable</span>;
  }
  const value = analytics.coveragePercentage;
  const exceeds = analytics.coverageStatus === "exceeds_100" || value > 100;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-line/80">
        <span
          className={cn("block h-full rounded-full", exceeds ? "bg-gold-500" : "bg-saffron-600")}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </span>
      <span
        className={cn(
          "text-[0.72rem] font-semibold tabular-nums",
          exceeds ? "text-gold-700" : "text-bark-900",
        )}
      >
        {value.toFixed(1)}%
        {exceeds ? <span className="ml-1 text-[0.62rem] text-gold-600">↑</span> : null}
      </span>
    </span>
  );
}

export default function MapWorkspace({
  initialAreas = [],
  initialAnalytics = [],
  initialError = null,
}) {
  const { user } = useSession();
  const reduce = useReducedMotion();
  const [areas, setAreas] = useState(initialAreas);
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [loadError, setLoadError] = useState(initialError);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [view, setView] = useState("atlas");
  const [selectedId, setSelectedId] = useState(null);
  const [proposalOpen, setProposalOpen] = useState(false);

  const canPropose =
    Boolean(user) &&
    (user.role === "admin" || user.role === "super_admin" || user.status === "active");
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const hasGoogleKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

  const analyticsById = useMemo(() => {
    const map = new Map();
    for (const entry of analytics) map.set(entry.areaId, entry);
    return map;
  }, [analytics]);

  const childrenByParent = useMemo(() => {
    const map = new Map();
    for (const area of areas) {
      const parentKey =
        typeof area.parentId === "object" && area.parentId
          ? (area.parentId._id ?? area.parentId.id)
          : area.parentId;
      if (!parentKey) continue;
      if (!map.has(parentKey)) map.set(parentKey, []);
      map.get(parentKey).push(area);
    }
    return map;
  }, [areas]);

  const types = useMemo(
    () => Array.from(new Set(areas.map((area) => area.type || "Locality"))).sort(),
    [areas],
  );

  const filteredAreas = useMemo(() => {
    const term = search.trim().toLowerCase();
    return areas.filter((area) => {
      const parentName =
        typeof area.parentId === "object" && area.parentId ? area.parentId.name : "";
      const matchesTerm =
        !term ||
        area.name?.toLowerCase().includes(term) ||
        area.formattedAddress?.toLowerCase().includes(term) ||
        area.code?.toLowerCase().includes(term) ||
        parentName?.toLowerCase().includes(term);
      const matchesType = typeFilter === "all" || (area.type || "Locality") === typeFilter;
      return matchesTerm && matchesType;
    });
  }, [areas, search, typeFilter]);

  const selectedArea = areas.find((area) => area._id === selectedId) ?? null;
  const selectedAnalytics = selectedId ? analyticsById.get(selectedId) : null;
  const selectedChildren = selectedId ? (childrenByParent.get(selectedId) ?? []) : [];

  const metrics = useMemo(() => {
    const invitations = analytics.reduce(
      (sum, entry) => sum + (entry.directInvitationCount ?? 0),
      0,
    );
    const withPopulation = analytics.filter(
      (entry) => typeof entry.populationEstimate === "number" && entry.populationEstimate > 0,
    ).length;
    const withReports = analytics.filter((entry) => (entry.directReportCount ?? 0) > 0).length;
    return { invitations, withPopulation, withReports };
  }, [analytics]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setLoadError(null);
    try {
      const [areasData, coverageData] = await Promise.all([
        apiFetch("/api/areas"),
        apiFetch("/api/analytics/coverage"),
      ]);
      setAreas(areasData?.areas ?? []);
      setAnalytics(coverageData?.analytics ?? []);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  function selectArea(areaId) {
    setSelectedId(areaId);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      window.setTimeout(() => {
        document.getElementById("area-detail")?.scrollIntoView({
          behavior: reduce ? "auto" : "smooth",
          block: "start",
        });
      }, 60);
    }
  }

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
  }

  return (
    <div className="pattern-contour relative overflow-hidden bg-cream">
      <div className="shell relative py-10 sm:py-12">
        <div className="rounded-2xl border border-line bg-white/80 px-5 py-4 shadow-soft sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-line">
            <Metric
              label="Approved localities"
              value={formatNumber(areas.length)}
              note="Officially published on the map"
              loading={refreshing && areas.length === 0}
            />
            <Metric
              label="Invitations recorded"
              value={analytics.length === 0 && loadError ? "—" : formatNumber(metrics.invitations)}
              note="Direct reports across all approved areas"
              loading={refreshing && analytics.length === 0}
            />
            <Metric
              label="With population data"
              value={
                analytics.length === 0 && loadError ? "—" : formatNumber(metrics.withPopulation)
              }
              note="Coverage can be calculated"
              loading={refreshing && analytics.length === 0}
            />
            <Metric
              label="Areas with reports"
              value={analytics.length === 0 && loadError ? "—" : formatNumber(metrics.withReports)}
              note="Active reports, counted once"
              loading={refreshing && analytics.length === 0}
            />
          </div>
        </div>

        {loadError ? (
          <Notice tone="error" className="mt-4" title="Live map data could not be refreshed">
            {loadError}{" "}
            <button
              type="button"
              onClick={refresh}
              className="font-semibold underline underline-offset-2"
            >
              Try again
            </button>
            . The figures below may be from the last successful load.
          </Notice>
        ) : null}

        <div className="mt-5 rounded-2xl border border-line bg-white p-3.5 shadow-soft sm:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:max-w-sm">
                <label htmlFor="area-search" className="sr-only">
                  Search approved localities
                </label>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-400"
                  fill="none"
                >
                  <path
                    d="m17 17-3.8-3.8m1.2-4.4a5.9 5.9 0 1 1-11.8 0 5.9 5.9 0 0 1 11.8 0Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  id="area-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search locality, code, or address…"
                  className="input-base !py-2.5 !pl-10"
                />
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="area-type" className="sr-only">
                  Filter by area type
                </label>
                <select
                  id="area-type"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="input-base !w-auto !py-2.5 !pr-9 text-[0.8rem]"
                >
                  <option value="all">All types ({areas.length})</option>
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {type} ({areas.filter((area) => (area.type || "Locality") === type).length})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Tabs
                items={[
                  { value: "atlas", label: "Atlas" },
                  { value: "directory", label: "Directory" },
                ]}
                value={view}
                onChange={setView}
                ariaLabel="Map view"
              />
              <button
                type="button"
                onClick={refresh}
                disabled={refreshing}
                aria-label="Refresh map data"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink-500 transition-colors hover:border-gold-400 hover:text-bark-900 disabled:opacity-40"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className={cn("h-4 w-4", refreshing && "animate-spin")}
                  fill="none"
                >
                  <path
                    d="M16.2 7.2A6.5 6.5 0 1 0 16.5 12M16.2 7.2V3.5m0 3.7h-3.7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {canPropose ? (
                <Button size="sm" onClick={() => setProposalOpen(true)}>
                  Propose a locality
                </Button>
              ) : user ? (
                <ButtonLink href="/application-status" variant="secondary" size="sm">
                  Proposal needs approval
                </ButtonLink>
              ) : (
                <ButtonLink href="/apply?mode=login" variant="secondary" size="sm">
                  Sign in to propose
                </ButtonLink>
              )}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[0.68rem] text-ink-400">
              {filteredAreas.length === areas.length
                ? `${areas.length} approved ${areas.length === 1 ? "locality" : "localities"}`
                : `Showing ${filteredAreas.length} of ${areas.length} approved localities`}
            </p>
            <p className="text-[0.68rem] text-ink-400">
              Pending proposals are never shown here and never counted.
            </p>
          </div>
        </div>

        {areas.length === 0 && !loadError ? (
          <div className="mt-5">
            <EmptyState
              icon="map"
              title="The official map is ready for its first locality"
              description="Once an administrator approves an area, it will appear here with its public coverage details. Pending proposals do not appear."
              action={
                canPropose ? (
                  <Button onClick={() => setProposalOpen(true)}>Propose the first locality</Button>
                ) : (
                  <ButtonLink href="/about" variant="secondary">
                    How the map works
                  </ButtonLink>
                )
              }
            />
          </div>
        ) : (
          <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:gap-6">
            <div className="min-w-0 space-y-5">
              {view === "atlas" ? (
                <div>
                  {hasGoogleKey ? (
                    <GoogleMapCanvas
                      areas={filteredAreas}
                      selectedId={selectedId}
                      onSelect={selectArea}
                    />
                  ) : (
                    <SvgAtlas areas={filteredAreas} selectedId={selectedId} onSelect={selectArea} />
                  )}

                  {filteredAreas.length > 0 ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white/70 px-3.5 py-3">
                      <span className="text-[0.64rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                        Jump to
                      </span>
                      {filteredAreas.slice(0, 8).map((area) => (
                        <button
                          key={area._id}
                          type="button"
                          onClick={() => selectArea(area._id)}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold transition-colors",
                            area._id === selectedId
                              ? "border-saffron-300 bg-saffron-50 text-saffron-800"
                              : "border-line bg-white text-ink-600 hover:border-gold-400 hover:text-bark-900",
                          )}
                        >
                          {area.name}
                        </button>
                      ))}
                      {filteredAreas.length > 8 ? (
                        <button
                          type="button"
                          onClick={() => setView("directory")}
                          className="text-[0.7rem] font-semibold text-saffron-700 underline underline-offset-2 hover:text-saffron-800"
                        >
                          +{filteredAreas.length - 8} more
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="table-shell">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-white px-4 py-3.5">
                    <div>
                      <h2 className="text-base font-semibold text-bark-900">Approved directory</h2>
                      <p className="mt-0.5 text-[0.7rem] text-ink-400">
                        A non-map view of the same official areas.
                      </p>
                    </div>
                    <span className="rounded-full border border-line bg-cream px-2.5 py-1 text-[0.64rem] font-bold tracking-[0.08em] text-ink-500 uppercase">
                      {filteredAreas.length} shown
                    </span>
                  </div>

                  {filteredAreas.length === 0 ? (
                    <EmptyState
                      icon="search"
                      className="m-4"
                      title="No approved locality matches"
                      description="Try a different name, code, address, or type. Pending proposals are not part of this directory."
                      action={
                        <Button variant="secondary" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      }
                    />
                  ) : (
                    <>
                      <div className="hidden grid-cols-[1.5fr_0.8fr_0.8fr_auto] gap-4 border-b border-line bg-cream/60 px-4 py-2.5 text-[0.6rem] font-bold tracking-[0.12em] text-ink-400 uppercase md:grid">
                        <span>Locality</span>
                        <span>Invitations</span>
                        <span>Coverage</span>
                        <span className="text-right">Inspect</span>
                      </div>
                      <ul className="divide-y divide-line">
                        {filteredAreas.map((area) => {
                          const entry = analyticsById.get(area._id);
                          const parentName =
                            typeof area.parentId === "object" && area.parentId
                              ? area.parentId.name
                              : null;
                          return (
                            <li key={area._id}>
                              <button
                                type="button"
                                onClick={() => selectArea(area._id)}
                                aria-pressed={area._id === selectedId}
                                className={cn(
                                  "grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 text-left transition-colors md:grid-cols-[1.5fr_0.8fr_0.8fr_auto] md:gap-4",
                                  area._id === selectedId
                                    ? "bg-saffron-50/70"
                                    : "hover:bg-cream/60",
                                )}
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-semibold text-bark-900">
                                    {area.name}
                                  </span>
                                  <span className="mt-0.5 block truncate text-[0.68rem] text-ink-400">
                                    {area.type || "Locality"}
                                    {parentName ? ` · ${parentName}` : ""}
                                    {area.code ? ` · ${area.code}` : ""}
                                  </span>
                                  <span className="mt-1.5 flex items-center gap-3 md:hidden">
                                    <CoverageMini analytics={entry} />
                                  </span>
                                </span>
                                <span className="hidden text-[0.78rem] font-semibold text-ink-600 tabular-nums md:block">
                                  {entry ? formatNumber(entry.totalInvitations) : "—"}
                                </span>
                                <span className="hidden md:block">
                                  <CoverageMini analytics={entry} />
                                </span>
                                <span className="flex items-center gap-1 text-[0.72rem] font-semibold text-saffron-700">
                                  <span className="hidden sm:inline">Inspect</span>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>

            <div id="area-detail" className="space-y-5 lg:sticky lg:top-24">
              {selectedArea ? (
                <AreaDetailsPanel
                  area={selectedArea}
                  analytics={selectedAnalytics}
                  childAreas={selectedChildren}
                  isAdmin={isAdmin}
                  onClose={() => setSelectedId(null)}
                  onSelect={selectArea}
                />
              ) : (
                <div className="card-paper p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-saffron-50 text-saffron-700">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                      <path
                        d="M9 3 3.8 5.1v15.4L9 18.4l6 2.1 5.2-2.1V3.1L15 5.2 9 3Zm0 0v15.4m6-13.2v15.3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <h2 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-bark-900">
                    Select a locality
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">
                    Choose an approved area on the atlas or in the directory to inspect its
                    hierarchy, population estimate, invitation totals and coverage.
                  </p>
                  <ul className="mt-5 space-y-2.5 text-[0.76rem] leading-relaxed text-ink-500">
                    <li className="flex items-start gap-2.5">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-saffron-600" />
                      Only approved areas appear in this workspace.
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-saffron-600" />
                      Parent totals include approved children exactly once.
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-saffron-600" />
                      Missing population is shown as unavailable, never 0%.
                    </li>
                  </ul>
                </div>
              )}

              <div className="relative overflow-hidden rounded-2xl bg-bark-950 p-5 text-ivory">
                <div className="pattern-jaali absolute inset-0 opacity-[0.14]" aria-hidden="true" />
                <div className="relative">
                  <p className="text-[0.6rem] font-bold tracking-[0.16em] text-gold-300 uppercase">
                    Official Mahotsav venue
                  </p>
                  <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em]">
                    Kulti Golf Ground, Kulti
                  </h3>
                  <p className="mt-2 text-[0.76rem] leading-relaxed text-ivory/55">
                    The central celebration gathers at Kulti Golf Ground, Kulti. The destination
                    below is the verified official short link — no coordinates are invented.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <ButtonLink
                      href={VENUE_DIRECTIONS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outline-light"
                      size="sm"
                    >
                      Get directions <ArrowRight className="h-3.5 w-3.5" />
                    </ButtonLink>
                    <ButtonLink
                      href={VENUE_SHORT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="secondary"
                      size="sm"
                    >
                      Open in Google Maps
                    </ButtonLink>
                  </div>
                </div>
              </div>

              <p className="text-[0.68rem] leading-relaxed text-ink-400">
                Coverage = reported invitations ÷ recorded population estimate. Figures above 100%
                stay visible and are flagged. The map does not rank devotees or publish contributor
                identities.
              </p>
            </div>
          </div>
        )}
      </div>

      <ProposeAreaModal
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
        areas={areas}
        defaultParentId={selectedId ?? ""}
        onSubmitted={refresh}
      />
    </div>
  );
}
