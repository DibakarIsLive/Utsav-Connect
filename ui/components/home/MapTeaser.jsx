"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/ui/components/ui/EmptyState";
import { ButtonLink, ArrowRight } from "@/ui/components/ui/Button";

/**
 * Live snapshot of approved localities for the homepage. It consumes the same
 * public coverage endpoint as the map, so pending proposals and private
 * reports can never appear here.
 */
export default function MapTeaser() {
  const [state, setState] = useState({ status: "loading", areas: [] });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/analytics/coverage", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) throw new Error("unavailable");
        const analytics = Array.isArray(payload.data?.analytics) ? payload.data.analytics : [];
        const visible = [...analytics]
          .sort((a, b) => (b.totalInvitations || 0) - (a.totalInvitations || 0))
          .slice(0, 4);
        if (!cancelled) setState({ status: "ready", areas: visible });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", areas: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-bark-950 p-6 text-ivory shadow-[var(--shadow-arch)] sm:p-8">
      <div className="pattern-jaali absolute inset-0 opacity-[0.18]" aria-hidden="true" />
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-saffron-600/15 blur-3xl" aria-hidden="true" />

      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow text-gold-300">Live coverage</p>
            <h3 className="mt-2 text-[1.45rem] font-semibold tracking-[-0.03em] text-ivory">
              Approved localities
            </h3>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[0.62rem] font-bold tracking-[0.12em] uppercase text-ivory/60">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-400" />
            </span>
            Updated live
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {state.status === "loading"
            ? [0, 1, 2].map((index) => (
                <div key={index} className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                  <div className="skeleton h-3 w-1/2 rounded-full opacity-30" />
                  <div className="skeleton mt-2 h-2 w-full rounded-full opacity-20" />
                </div>
              ))
            : null}

          {state.status === "error" ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm leading-relaxed text-ivory/60">
              Coverage data could not be loaded right now. Open the map to see approved
              localities directly.
            </p>
          ) : null}

          {state.status === "ready" && state.areas.length === 0 ? (
            <EmptyState
              tone="dark"
              icon="map"
              title="The map is ready to grow"
              description="Approved localities will appear here once an administrator publishes them."
              className="border-white/15 bg-white/[0.03] py-8"
            />
          ) : null}

          {state.status === "ready" && state.areas.length > 0
            ? state.areas.map((area) => (
                <div
                  key={area.areaId}
                  className="rounded-xl border border-white/10 bg-white/[0.045] p-3.5 transition-colors hover:bg-white/[0.075]"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-ivory">{area.name}</p>
                    <p className="shrink-0 text-[0.68rem] font-bold tracking-[0.06em] text-ivory/45 uppercase">
                      {area.type}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-[0.7rem] text-ivory/50">
                    <span>{area.totalInvitations.toLocaleString("en-IN")} invitations</span>
                    <span>
                      {area.coveragePercentage === null
                        ? "Coverage unavailable"
                        : `${area.coveragePercentage.toFixed(1)}% coverage`}
                    </span>
                  </div>
                </div>
              ))
            : null}
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <p className="text-[0.66rem] leading-relaxed text-ivory/40">
            Approved areas only. Pending proposals never affect these totals.
          </p>
          <ButtonLink href="/map" variant="gold" size="sm">
            Explore the map
            <ArrowRight className="h-3.5 w-3.5" />
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
