"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import AdminPageHeader from "@/ui/components/admin/AdminPageHeader";
import Badge, { StatusBadge } from "@/ui/components/ui/Badge";
import Notice from "@/ui/components/ui/Notice";
import EmptyState from "@/ui/components/ui/EmptyState";
import Skeleton from "@/ui/components/ui/Skeleton";
import { Button, ArrowRight } from "@/ui/components/ui/Button";
import { apiFetch } from "@/ui/lib/api-client";
import { formatDate, formatNumber } from "@/ui/lib/format";
import { cn } from "@/ui/lib/cn";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminApplicationsClient({ initialStatus = "", canReview = false }) {
  const [status, setStatus] = useState(initialStatus);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [state, setState] = useState({ status: "loading", error: null });
  const requestRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setState({ status: "loading", error: null });
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      const data = await apiFetch(`/api/admin/applications?${params.toString()}`);
      if (requestRef.current !== requestId) return;
      setApplications(data?.applications ?? []);
      setPagination(data?.pagination ?? { page, total: 0, totalPages: 1 });
      setState({ status: "ready", error: null });
    } catch (error) {
      if (requestRef.current !== requestId) return;
      setState({ status: "error", error: error.message });
    }
  }, [page, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setPage(1);
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Applications"
        title="The people behind every application."
        description="Read each application on its own terms, record a clear decision, and keep internal notes internal. Approval activates the account without a second sign-up."
        actions={
          <Badge tone="neutral">
            {state.status === "ready" ? `${formatNumber(pagination.total)} total` : "Live queue"}
          </Badge>
        }
      />

      <div className="border-line shadow-soft rounded-2xl border bg-white">
        <div className="border-line flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1 sm:max-w-sm">
              <label htmlFor="applicationSearch" className="sr-only">
                Search applications by name or email
              </label>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="text-ink-400 pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2"
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
                id="applicationSearch"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search name or email…"
                className="input-base !py-2.5 !pl-10 text-[0.82rem]"
              />
            </div>
            <div>
              <label htmlFor="applicationStatus" className="sr-only">
                Filter by application status
              </label>
              <select
                id="applicationStatus"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="input-base !w-auto !py-2.5 text-[0.82rem]"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(status || search || searchInput) && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Clear filters
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={load} disabled={state.status === "loading"}>
              {state.status === "loading" ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </div>

        {state.status === "error" ? (
          <div className="p-4">
            <Notice tone="error" title="Applications could not be loaded">
              {state.error}
              <button
                type="button"
                onClick={load}
                className="mt-2 block font-semibold underline underline-offset-2"
              >
                Try again
              </button>
            </Notice>
          </div>
        ) : null}

        {state.status === "loading" ? (
          <div className="space-y-3 p-4 sm:p-5" aria-busy="true">
            {[0, 1, 2, 3, 4].map((index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            ))}
            <span className="sr-only">Loading applications…</span>
          </div>
        ) : null}

        {state.status === "ready" && applications.length === 0 ? (
          <EmptyState
            icon="people"
            className="border-0 shadow-none"
            title={
              search || status ? "No application matches these filters" : "No applications yet"
            }
            description={
              search || status
                ? "Try a different name, email or status. The filters apply to real application records only."
                : "New applications will appear here after the email-verification step. Nothing is pre-filled or simulated."
            }
            action={
              search || status ? (
                <Button variant="secondary" onClick={resetFilters}>
                  Clear filters
                </Button>
              ) : null
            }
          />
        ) : null}

        {state.status === "ready" && applications.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-cream/60 text-ink-400 border-line border-b text-[0.6rem] font-bold tracking-[0.12em] uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 sm:px-5">
                      Applicant
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      Applied
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right sm:px-5">
                      Open
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-line divide-y">
                  {applications.map((application) => (
                    <tr key={application.id} className="hover:bg-cream/40 transition-colors">
                      <td className="px-4 py-3.5 sm:px-5">
                        <Link
                          href={`/admin/applications/${application.id}`}
                          className="text-bark-900 hover:text-saffron-700 text-sm font-semibold"
                        >
                          {application.applicantName}
                        </Link>
                        <p className="text-ink-400 mt-0.5 text-[0.7rem]">
                          {application.applicantEmail}
                        </p>
                      </td>
                      <td className="text-ink-600 px-4 py-3.5 text-[0.78rem] whitespace-nowrap">
                        {formatDate(application.createdAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={application.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right sm:px-5">
                        <Link
                          href={`/admin/applications/${application.id}`}
                          className="text-saffron-700 hover:text-saffron-800 inline-flex items-center gap-1 text-[0.74rem] font-semibold"
                        >
                          Review <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-line divide-y md:hidden">
              {applications.map((application) => (
                <li key={application.id}>
                  <Link
                    href={`/admin/applications/${application.id}`}
                    className="hover:bg-cream/40 block px-4 py-3.5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-bark-900 truncate text-sm font-semibold">
                          {application.applicantName}
                        </p>
                        <p className="text-ink-400 mt-0.5 truncate text-[0.7rem]">
                          {application.applicantEmail}
                        </p>
                        <p className="text-ink-400 mt-1 text-[0.68rem]">
                          Applied {formatDate(application.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={application.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="border-line flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-5">
              <p className="text-ink-400 text-[0.72rem]">
                Page {pagination.page} of {Math.max(1, pagination.totalPages)} ·{" "}
                {formatNumber(pagination.total)}{" "}
                {pagination.total === 1 ? "application" : "applications"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={pagination.page <= 1 || state.status === "loading"}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setPage((value) => Math.min(Math.max(1, pagination.totalPages), value + 1))
                  }
                  disabled={
                    pagination.page >= pagination.totalPages || state.status === "loading"
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {!canReview ? (
        <Notice tone="info" className="mt-4" title="Read-only application access">
          Your account can read applications but cannot approve or reject them. The review buttons
          remain disabled, and the API refuses the action regardless of the interface.
        </Notice>
      ) : null}
    </div>
  );
}
