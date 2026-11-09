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
      <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b bg-cream/50 px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-bark-900 text-base font-semibold">Your invitation history</h2>
          <p className="text-ink-400 mt-0.5 text-[0.7rem]">
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
          <p className="text-ink-500 text-sm">No report with this status.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => setStatus("all")}>
            Show every report
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-cream/60 text-ink-400 border-line border-b text-[0.6rem] font-bold tracking-[0.12em] uppercase">
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
              <tbody className="divide-line divide-y">
                {filtered.map((report) => (
                  <tr key={report._id} className="hover:bg-cream/40 transition-colors">
                    <td className="px-4 py-3 sm:px-5">
                      <span className="text-bark-900 block text-sm font-semibold">
                        {report.areaId?.name || "Locality unavailable"}
                      </span>
                      <span className="text-ink-400 block text-[0.66rem]">
                        {report.areaId?.type || "Locality"}
                        {report.areaId?.code ? ` · ${report.areaId.code}` : ""}
                      </span>
                    </td>
                    <td className="text-bark-900 px-4 py-3 text-right font-semibold tabular-nums">
                      +{Number(report.invitationCount).toLocaleString("en-IN")}
                    </td>
                    <td className="text-ink-600 px-4 py-3 text-[0.78rem] whitespace-nowrap">
                      {formatDate(report.reportDate)}
                    </td>
                    <td className="text-ink-500 max-w-[16rem] px-4 py-3 text-[0.76rem]">
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
          <ul className="divide-line divide-y md:hidden">
            {filtered.map((report) => (
              <li key={report._id} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-bark-900 truncate text-sm font-semibold">
                      {report.areaId?.name || "Locality unavailable"}
                    </p>
                    <p className="text-ink-400 mt-0.5 text-[0.66rem]">
                      {formatDate(report.reportDate)}
                      {report.areaId?.type ? ` · ${report.areaId.type}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={report.status} />
                </div>
                <div className="mt-2.5 flex items-start justify-between gap-4">
                  <p className="text-ink-500 text-[0.76rem] leading-relaxed">
                    {report.description || "No note added."}
                  </p>
                  <p className="text-bark-900 shrink-0 text-sm font-semibold tabular-nums">
                    +{Number(report.invitationCount).toLocaleString("en-IN")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {!compact && reports.some((report) => report.status !== "active") ? (
        <div className="border-line bg-cream/40 border-t px-4 py-3 sm:px-5">
          <p className="text-ink-400 text-[0.68rem] leading-relaxed">
            Flagged reports are under administrative review. Invalid reports are excluded from
            public coverage. Internal reviewer notes are not shown here.
          </p>
        </div>
      ) : null}
    </div>
  );
}
