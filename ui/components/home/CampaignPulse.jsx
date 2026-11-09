"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@/ui/components/ui/Button";

/**
 * Live campaign totals shown under the hero. Values come only from the
 * public coverage endpoint; when data is unavailable the band says so instead
 * of inventing numbers. Parent-child totals are read from root areas so no
 * descendant report is counted twice.
 */
export default function CampaignPulse() {
  const [state, setState] = useState({ status: "loading", metrics: null });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/analytics/coverage", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) throw new Error("unavailable");
        const analytics = Array.isArray(payload.data?.analytics) ? payload.data.analytics : [];
        if (analytics.length === 0) {
          if (!cancelled) setState({ status: "empty", metrics: null });
          return;
        }
        // Direct counts are available on every approved area, so the campaign
        // total never double-counts a report rolled up into a parent.
        const invitations = analytics.reduce(
          (sum, area) =>
            sum +
            (typeof area.directInvitationCount === "number"
              ? area.directInvitationCount
              : 0),
          0,
        );
        const withPopulation = analytics.filter(
          (area) => typeof area.populationEstimate === "number" && area.populationEstimate > 0,
        ).length;
        if (!cancelled) {
          setState({
            status: "ready",
            metrics: {
              areas: analytics.length,
              invitations,
              withPopulation,
            },
          });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", metrics: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="border-line/70 bg-ivory/95 shadow-soft relative z-10 -mt-px border-y">
        <div className="shell grid gap-px py-6 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="px-2 py-3 sm:px-6">
              <div className="skeleton h-3 w-24 rounded-full" />
              <div className="skeleton mt-3 h-7 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="border-line/70 bg-ivory relative z-10 border-y">
        <div className="shell flex flex-col items-start justify-between gap-3 py-5 sm:flex-row sm:items-center">
          <p className="text-ink-500 text-sm">
            Live campaign totals are temporarily unavailable. The map still opens normally.
          </p>
          <Link
            href="/map"
            className="text-saffron-700 hover:text-saffron-800 inline-flex items-center gap-1.5 text-sm font-semibold"
          >
            Open the map <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div className="border-line/70 bg-ivory relative z-10 border-y">
        <div className="shell flex flex-col items-start justify-between gap-3 py-5 sm:flex-row sm:items-center">
          <p className="text-ink-500 text-sm">
            The campaign map is ready. Approved localities will appear here as they are added.
          </p>
          <Link
            href="/about"
            className="text-saffron-700 hover:text-saffron-800 inline-flex items-center gap-1.5 text-sm font-semibold"
          >
            How the map works <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const metrics = [
    { label: "Approved localities", value: state.metrics.areas, note: "Officially published" },
    {
      label: "Invitations recorded",
      value: state.metrics.invitations.toLocaleString("en-IN"),
      note: "Active reports, counted once",
    },
    {
      label: "Areas with population data",
      value: state.metrics.withPopulation,
      note: "Coverage can be calculated",
    },
  ];

  return (
    <div className="border-line/70 bg-ivory relative z-10 border-y">
      <div className="shell grid sm:grid-cols-3">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={
              index === 0
                ? "border-line py-6 sm:border-r sm:pr-8"
                : index === 1
                  ? "border-line border-t py-6 sm:border-r sm:border-t-0 sm:px-8"
                  : "border-line border-t py-6 sm:border-t-0 sm:pl-8"
            }
          >
            <p className="text-ink-400 text-[0.66rem] font-bold tracking-[0.16em] uppercase">
              {metric.label}
            </p>
            <p className="font-display text-bark-900 mt-2 text-[1.7rem] leading-none font-semibold tracking-[-0.03em]">
              {metric.value}
            </p>
            <p className="text-ink-400 mt-1.5 text-[0.7rem]">{metric.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
