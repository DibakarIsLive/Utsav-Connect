"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/ui/components/ui/Badge";
import EmptyState from "@/ui/components/ui/EmptyState";
import { Button } from "@/ui/components/ui/Button";
import { formatDate } from "@/ui/lib/format";

/**
 * Personal invitation history. It is intentionally not a leaderboard: it
 * shows the signed-in devotee their own reports, whether each is active,
 * flagged, or invalid, and never exposes other contributors.
 */
export default function ReportHistoryTable({ reports = [], compact = false, action }) {
  const [status, setStatus] = useState("all");

  const filtered = useMemo(
    () => (status === "all" ? reports : reports.filter((report) => report.status === status)),
    [reports, status],
  );

  if (reports.length === 0) {
    return (
      <EmptyState
        icon="report"
        title="No invitation reports yet"
        description="When you record the invitations you extend, they appear here with their date, locality and review status. This history is visible only to you and authorised reviewers."
        action={action}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-cream/50 px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-base font-semibold text-bark-900">Your invitation history</h2>
          <p className="mt-0.5 text-[0.7rem] text-ink-400">
            {reports.length} {reports.length === 1 ? "report" : "reports"} · private to you
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="reportStatusFilter" className="sr-only">
            Filter reports by status
          </label>
          <select
            id="reportStatusFilter"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="input-base !w-auto !py-1.5 !text-[0.72rem]"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="flagged">Flagged</option>
            <option value="invalid">Invalid</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm text-ink-500">No report with this status.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => setStatus("all")}>
            Show every report
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-cream/60 text-[0.6rem] font-bold tracking-[0.12em] text-ink-400 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-2.5 sm:px-5">
                    Locality
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right">
                    Invitations
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Note
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right sm:px-5">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((report) => (
                  <tr key={report._id} className="transition-colors hover:bg-cream/40">
                    <td className="px-4 py-3 sm:px-5">
                      <span className="block text-sm font-semibold text-bark-900">
                        {report.areaId?.name || "Locality unavailable"}
                      </span>
                      <span className="block text-[0.66rem] text-ink-400">
                        {report.areaId?.type || "Locality"}
                        {report.areaId?.code ? ` · ${report.areaId.code}` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-bark-900 tabular-nums">
                      +{Number(report.invitationCount).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-[0.78rem] whitespace-nowrap text-ink-600">
                      {formatDate(report.reportDate)}
                    </td>
                    <td className="max-w-[16rem] px-4 py-3 text-[0.76rem] text-ink-500">
                      <span className="line-clamp-2">{report.description || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-right sm:px-5">
                      <StatusBadge status={report.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-line md:hidden">
            {filtered.map((report) => (
              <li key={report._id} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-bark-900">
                      {report.areaId?.name || "Locality unavailable"}
                    </p>
                    <p className="mt-0.5 text-[0.66rem] text-ink-400">
                      {formatDate(report.reportDate)}
                      {report.areaId?.type ? ` · ${report.areaId.type}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={report.status} />
                </div>
                <div className="mt-2.5 flex items-start justify-between gap-4">
                  <p className="text-[0.76rem] leading-relaxed text-ink-500">
                    {report.description || "No note added."}
                  </p>
                  <p className="shrink-0 text-sm font-semibold text-bark-900 tabular-nums">
                    +{Number(report.invitationCount).toLocaleString("en-IN")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {!compact && reports.some((report) => report.status !== "active") ? (
        <div className="border-t border-line bg-cream/40 px-4 py-3 sm:px-5">
          <p className="text-[0.68rem] leading-relaxed text-ink-400">
            Flagged reports are under administrative review. Invalid reports are excluded from
            public coverage. Internal reviewer notes are not shown here.
          </p>
        </div>
      ) : null}
    </div>
  );
}
