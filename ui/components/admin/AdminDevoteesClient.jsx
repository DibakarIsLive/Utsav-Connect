"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import AdminPageHeader from "@/ui/components/admin/AdminPageHeader";
import Notice from "@/ui/components/ui/Notice";
import EmptyState from "@/ui/components/ui/EmptyState";
import Skeleton from "@/ui/components/ui/Skeleton";
import Badge, { StatusBadge } from "@/ui/components/ui/Badge";
import { Button, ArrowRight } from "@/ui/components/ui/Button";
import { apiFetch } from "@/ui/lib/api-client";
import { formatDate } from "@/ui/lib/format";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "pending_verification", label: "Pending verification" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

export default function AdminDevoteesClient({ canManage = false }) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [accounts, setAccounts] = useState([]);
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
      const data = await apiFetch(`/api/admin/accounts?${params.toString()}`);
      if (requestRef.current !== requestId) return;
      setAccounts(data?.accounts ?? []);
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

  return (
    <div>
      <AdminPageHeader
        eyebrow="Devotee management"
        title="The people behind the outreach."
        description="A shared directory for authorised administrators. Contact details are masked in lists; full detail is available only to permitted reviewers."
        actions={
          <Badge tone="neutral">
            {state.status === "ready" ? `${pagination.total} accounts` : "Live directory"}
          </Badge>
        }
      />

      <div className="rounded-2xl border border-line bg-white shadow-soft">
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2.5 sm:flex-row">
            <input
              id="devoteeSearch"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search name or email…"
              className="input-base !py-2.5 text-[0.82rem]"
              aria-label="Search devotees by name or email"
            />
            <select
              id="devoteeStatus"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="input-base !w-auto !py-2.5 text-[0.82rem]"
              aria-label="Filter devotees by status"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={load}
            disabled={state.status === "loading"}
          >
            {state.status === "loading" ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        {state.status === "error" ? (
          <div className="p-4">
            <Notice tone="error" title="Directory unavailable">
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
          </div>
        ) : null}

        {state.status === "ready" && accounts.length === 0 ? (
          <EmptyState
            icon="people"
            className="border-0 shadow-none"
            title={
              search || status ? "No account matches these filters" : "No devotee accounts yet"
            }
            description="Accounts appear here after an application is approved. Nothing is invented."
          />
        ) : null}

        {state.status === "ready" && accounts.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-cream/60 text-[0.6rem] font-bold tracking-[0.12em] text-ink-400 uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 sm:px-5">
                      Account
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      Application
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      Joined
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right sm:px-5">
                      Open
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {accounts.map((account) => (
                    <tr key={account.id} className="transition-colors hover:bg-cream/40">
                      <td className="px-4 py-3.5 sm:px-5">
                        <Link
                          href={`/admin/devotees/${account.id}`}
                          className="text-sm font-semibold text-bark-900 hover:text-saffron-700"
                        >
                          {account.fullName}
                        </Link>
                        <p className="mt-0.5 text-[0.7rem] text-ink-400">{account.email}</p>
                        <p className="text-[0.68rem] text-ink-400">{account.phone}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={account.status} />
                      </td>
                      <td className="px-4 py-3.5 text-[0.78rem] text-ink-600">
                        {account.applicationStatus ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 text-[0.78rem] whitespace-nowrap text-ink-600">
                        {formatDate(account.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right sm:px-5">
                        <Link
                          href={`/admin/devotees/${account.id}`}
                          className="inline-flex items-center gap-1 text-[0.74rem] font-semibold text-saffron-700"
                        >
                          Review <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-line md:hidden">
              {accounts.map((account) => (
                <li key={account.id}>
                  <Link href={`/admin/devotees/${account.id}`} className="block px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-bark-900">
                          {account.fullName}
                        </p>
                        <p className="mt-0.5 truncate text-[0.7rem] text-ink-400">
                          {account.email}
                        </p>
                        <p className="mt-1 text-[0.68rem] text-ink-400">
                          Joined {formatDate(account.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={account.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
              <p className="text-[0.72rem] text-ink-400">
                Page {pagination.page} of {Math.max(1, pagination.totalPages)} · {pagination.total}{" "}
                accounts
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((v) => Math.max(1, v - 1))}
                  disabled={pagination.page <= 1 || state.status === "loading"}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setPage((v) => Math.min(Math.max(1, pagination.totalPages), v + 1))
                  }
                  disabled={pagination.page >= pagination.totalPages || state.status === "loading"}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
      {!canManage ? (
        <Notice tone="info" className="mt-4" title="Read-only account access">
          You can inspect accounts but cannot change account status. An administrator with
          <code className="mx-1">devotee:status:update</code> can suspend or reinstate devotees.
        </Notice>
      ) : null}
    </div>
  );
}
