"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminPageHeader from "@/ui/components/admin/AdminPageHeader";
import Badge from "@/ui/components/ui/Badge";
import Notice from "@/ui/components/ui/Notice";
import EmptyState from "@/ui/components/ui/EmptyState";
import Skeleton from "@/ui/components/ui/Skeleton";
import { Button } from "@/ui/components/ui/Button";
import { apiFetch } from "@/ui/lib/api-client";
import { formatDateTime, timeAgo } from "@/ui/lib/format";
import { cn } from "@/ui/lib/cn";

const CATEGORY_OPTIONS = [
  { value: "", label: "All events" },
  { value: "application", label: "Applications" },
  { value: "invitation", label: "Invitation reports" },
  { value: "proposal", label: "Proposals" },
  { value: "area", label: "Areas" },
  { value: "user", label: "Accounts & sessions" },
  { value: "admin", label: "Administration" },
  { value: "email", label: "Email verification" },
];

const EVENT_TONES = {
  application: "blue",
  invitation: "saffron",
  proposal: "gold",
  area: "green",
  user: "neutral",
  admin: "red",
  email: "neutral",
};

const ROLE_LABEL = {
  devotee: "Devotee",
  admin: "Administrator",
  super_admin: "Super Admin",
  system: "System",
};

function eventCategory(eventType) {
  return String(eventType ?? "").split(".")[0] || "other";
}

function eventLabel(eventType) {
  const [category, ...rest] = String(eventType ?? "").split(".");
  const action = rest.join(" ").replaceAll("_", " ").replaceAll(".", " ");
  const prefix =
    category === "admin"
      ? "Admin"
      : category === "email"
        ? "Email"
        : category.charAt(0).toUpperCase() + category.slice(1);
  return `${prefix} · ${action || "event"}`;
}

function MetadataList({ metadata }) {
  if (!metadata || typeof metadata !== "object" || Object.keys(metadata).length === 0) {
    return <span className="text-ink-400 text-[0.72rem]">No additional context.</span>;
  }
  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-1.5">
      {Object.entries(metadata).map(([key, value]) => (
        <div key={key} className="flex items-baseline gap-1.5">
          <dt className="text-ink-400 font-mono text-[0.62rem]">{key}</dt>
          <dd className="text-ink-600 text-[0.7rem]">
            {typeof value === "object" ? JSON.stringify(value) : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Append-only audit trail. The API restricts this to Super Admins and returns
 * real records only; no placeholder or fabricated security events are shown.
 */
export default function AdminAuditClient() {
  const [logs, setLogs] = useState([]);
  const [state, setState] = useState({ status: "loading", error: null });
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState("100");

  const load = useCallback(async () => {
    setState({ status: "loading", error: null });
    try {
      const data = await apiFetch(`/api/admin/audit-logs?limit=${encodeURIComponent(limit)}`);
      setLogs(data?.logs ?? []);
      setState({ status: "ready", error: null });
    } catch (error) {
      setState({ status: "error", error: error.message });
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (category && eventCategory(log.eventType) !== category) return false;
      if (!term) return true;
      return (
        log.eventType?.toLowerCase().includes(term) ||
        log.actorId?.fullName?.toLowerCase().includes(term) ||
        log.actorId?.email?.toLowerCase().includes(term) ||
        log.targetType?.toLowerCase().includes(term)
      );
    });
  }, [logs, category, search]);

  const categoryCounts = useMemo(() => {
    const counts = new Map();
    for (const log of logs) {
      const key = eventCategory(log.eventType);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [logs]);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Super Admin · Audit log"
        title="Because trust needs a record."
        description="An append-only trail of sign-ins, applications, reviews, geography changes and account creation. Entries are never edited or deleted from this workspace."
        actions={
          <Badge tone="neutral">
            {state.status === "ready" ? `${logs.length} loaded` : "Live trail"}
          </Badge>
        }
      />

      <Notice tone="info" className="mb-5" title="What this log contains">
        Event codes, actor roles, target types and safe context such as status changes. It does not
        contain passwords, invitee details, application notes or raw IP addresses — only a one-way
        hash where collected.
      </Notice>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { key: "application", label: "Applications" },
          { key: "invitation", label: "Invitation reports" },
          { key: "proposal", label: "Proposals" },
          { key: "admin", label: "Admin actions" },
        ].map((item) => (
          <div key={item.key} className="admin-card px-5 py-4">
            <Badge tone={EVENT_TONES[item.key] ?? "neutral"}>{item.label}</Badge>
            <p className="font-display text-bark-900 mt-2.5 text-2xl font-semibold tabular-nums">
              {state.status === "error" ? "—" : categoryCounts.get(item.key) ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="border-line shadow-soft rounded-2xl border bg-white">
        <div className="border-line flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1 sm:max-w-xs">
              <label htmlFor="auditSearch" className="sr-only">
                Search audit events
              </label>
              <input
                id="auditSearch"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search event, actor or target…"
                className="input-base !py-2.5 text-[0.82rem]"
              />
            </div>
            <div>
              <label htmlFor="auditCategory" className="sr-only">
                Filter events by category
              </label>
              <select
                id="auditCategory"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="input-base !w-auto !py-2.5 text-[0.82rem]"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="auditLimit" className="sr-only">
                Number of events to load
              </label>
              <select
                id="auditLimit"
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
                className="input-base !w-auto !py-2.5 text-[0.82rem]"
              >
                <option value="100">Latest 100</option>
                <option value="250">Latest 250</option>
                <option value="500">Latest 500</option>
              </select>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={load} disabled={state.status === "loading"}>
            {state.status === "loading" ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        {state.status === "error" ? (
          <div className="p-4">
            <Notice tone="error" title="The audit log could not be loaded">
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
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
            <span className="sr-only">Loading audit events…</span>
          </div>
        ) : null}

        {state.status === "ready" && filtered.length === 0 ? (
          <EmptyState
            icon="search"
            title={logs.length === 0 ? "No audit events yet" : "No event matches these filters"}
            description={
              logs.length === 0
                ? "Real sign-ins, applications and review decisions will appear here as they happen. Nothing is seeded or simulated."
                : "Try another category, search term or a larger limit."
            }
            action={
              logs.length > 0 ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setCategory("");
                  }}
                >
                  Clear filters
                </Button>
              ) : null
            }
          />
        ) : null}

        {state.status === "ready" && filtered.length > 0 ? (
          <ol className="divide-line divide-y">
            {filtered.map((log) => {
              const key = eventCategory(log.eventType);
              return (
                <li key={log._id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          key === "admin"
                            ? "bg-red-500"
                            : key === "invitation"
                              ? "bg-saffron-500"
                              : key === "proposal"
                                ? "bg-gold-500"
                                : key === "area"
                                  ? "bg-emerald-500"
                                  : key === "application"
                                    ? "bg-sky-500"
                                    : "bg-ink-300",
                        )}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-bark-900 text-[0.82rem] font-semibold">
                          {eventLabel(log.eventType)}
                        </p>
                        <p className="text-ink-400 mt-0.5 font-mono text-[0.62rem]">
                          {log.eventType}
                        </p>
                        <p className="text-ink-500 mt-1.5 text-[0.72rem]">
                          {log.actorId?.fullName ?? "Unknown actor"}
                          {log.actorId?.email ? ` · ${log.actorId.email}` : ""}
                          {" · "}
                          {ROLE_LABEL[log.actorRole] ?? log.actorRole ?? "unknown role"}
                          {log.targetType ? ` · target ${log.targetType}` : ""}
                        </p>
                        <div className="mt-2">
                          <MetadataList metadata={log.metadata} />
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge tone={EVENT_TONES[key] ?? "neutral"}>{key}</Badge>
                      <p className="text-ink-500 mt-1.5 text-[0.7rem] font-medium">
                        {timeAgo(log.createdAt)}
                      </p>
                      <p className="text-ink-400 mt-0.5 text-[0.62rem]">
                        {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>

      <p className="text-ink-400 mt-4 text-[0.72rem] leading-relaxed">
        Showing {filtered.length} of {logs.length} loaded entries, newest first. The API caps a single
        request at 500 entries; this page does not claim to show the complete lifetime history.
      </p>
    </div>
  );
}
