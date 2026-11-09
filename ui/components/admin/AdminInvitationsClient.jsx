"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminPageHeader from "@/ui/components/admin/AdminPageHeader";
import Badge, { StatusBadge } from "@/ui/components/ui/Badge";
import Notice from "@/ui/components/ui/Notice";
import EmptyState from "@/ui/components/ui/EmptyState";
import Skeleton from "@/ui/components/ui/Skeleton";
import Modal from "@/ui/components/ui/Modal";
import Field, { TextArea } from "@/ui/components/ui/Field";
import { Button, ArrowRight } from "@/ui/components/ui/Button";
import { apiFetch } from "@/ui/lib/api-client";
import { formatDate, formatDateTime, formatNumber } from "@/ui/lib/format";
import { cn } from "@/ui/lib/cn";

const STATUS_OPTIONS = [
  { value: "", label: "All reports" },
  { value: "active", label: "Active" },
  { value: "flagged", label: "Flagged" },
  { value: "invalid", label: "Invalid" },
];

const DECISIONS = [
  {
    value: "active",
    label: "Active",
    body: "Counts toward public coverage. Use this to restore a report after review.",
    tone: "border-emerald-300 bg-emerald-50",
  },
  {
    value: "flagged",
    label: "Flagged",
    body: "Under review. Excluded from public totals until resolved.",
    tone: "border-amber-300 bg-amber-50",
  },
  {
    value: "invalid",
    label: "Invalid",
    body: "Excluded permanently from coverage. Requires an audit note.",
    tone: "border-red-300 bg-red-50",
  },
];

/**
 * Report review workspace. Every figure here is a real stored report; nothing
 * is embellished. Invalidation is deliberately harder than flagging: it
 * requires a written note that is written to the audit log.
 */
export default function AdminInvitationsClient({ canReview = false }) {
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState("");
  const [state, setState] = useState({ status: "loading", error: null });
  const [reviewTarget, setReviewTarget] = useState(null);
  const [decision, setDecision] = useState("flagged");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setState({ status: "loading", error: null });
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const data = await apiFetch(`/api/admin/invitations?${params.toString()}`);
      setReports(data?.reports ?? []);
      setState({ status: "ready", error: null });
    } catch (error) {
      setState({ status: "error", error: error.message });
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const active = reports.filter((report) => report.status === "active");
    return {
      active: active.length,
      activeInvitations: active.reduce(
        (sum, report) => sum + (Number(report.invitationCount) || 0),
        0,
      ),
      flagged: reports.filter((report) => report.status === "flagged").length,
      invalid: reports.filter((report) => report.status === "invalid").length,
    };
  }, [reports]);

  function openReview(report) {
    setReviewTarget(report);
    setDecision(report.status === "active" ? "flagged" : report.status);
    setNotes(report.adminNotes ?? "");
    setErrors({});
  }

  function closeReview() {
    if (busy) return;
    setReviewTarget(null);
  }

  async function submitReview(event) {
    event.preventDefault();
    if (!reviewTarget) return;

    const nextErrors = {};
    if (decision === "invalid" && !notes.trim()) {
      nextErrors.notes = "An audit note is required to invalidate an invitation report.";
    }
    if (notes.length > 1000) nextErrors.notes = "Keep the note under 1000 characters.";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      if (nextErrors.notes) document.getElementById("reportReviewNotes")?.focus();
      return;
    }

    setBusy(true);
    setErrors({});
    try {
      await apiFetch(`/api/admin/invitations/${reviewTarget._id}/review`, {
        method: "POST",
        body: JSON.stringify({
          status: decision,
          adminNotes: notes.trim() || undefined,
        }),
      });
      setNotice({
        tone: decision === "invalid" ? "warning" : "success",
        title: "Report reviewed",
        body:
          decision === "invalid"
            ? `The report from ${reviewTarget.contributorId?.fullName ?? "this contributor"} is invalid and no longer counts toward public coverage.`
            : `The report from ${reviewTarget.contributorId?.fullName ?? "this contributor"} is now ${decision}. Public coverage reflects the change immediately.`,
      });
      setReviewTarget(null);
      await load();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Reporting"
        title="A quiet audit trail for every invitation."
        description="Read each report in context, resolve anything unclear, and keep public coverage honest. Flagging excludes a report from totals; invalidation requires a written audit note."
        actions={
          <Badge tone={totals.flagged > 0 ? "amber" : "neutral"}>
            {state.status === "ready" ? `${formatNumber(totals.flagged)} flagged` : "Live queue"}
          </Badge>
        }
      />

      {notice ? (
        <Notice tone={notice.tone} className="mb-4" title={notice.title}>
          {notice.body}
        </Notice>
      ) : null}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active reports", value: totals.active, tone: "green" },
          { label: "Active invitations", value: totals.activeInvitations, tone: "saffron" },
          { label: "Flagged", value: totals.flagged, tone: "amber" },
          { label: "Invalid", value: totals.invalid, tone: "red" },
        ].map((item) => (
          <div key={item.label} className="admin-card px-5 py-4">
            <Badge tone={item.tone}>{item.label}</Badge>
            <p className="font-display text-bark-900 mt-2.5 text-2xl font-semibold tabular-nums">
              {state.status === "error" ? "—" : formatNumber(item.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="border-line shadow-soft rounded-2xl border bg-white">
        <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h2 className="text-bark-900 text-sm font-semibold">Report queue</h2>
            <p className="text-ink-400 mt-0.5 text-[0.7rem]">
              Newest report date first. Contributor identity is visible only in this workspace.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="reportAdminStatus" className="sr-only">
              Filter reports by status
            </label>
            <select
              id="reportAdminStatus"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="input-base !w-auto !py-2 text-[0.78rem]"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button variant="secondary" size="sm" onClick={load} disabled={state.status === "loading"}>
              {state.status === "loading" ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </div>

        {state.status === "error" ? (
          <div className="p-4">
            <Notice tone="error" title="Reports could not be loaded">
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
              <Skeleton key={index} className="h-14 w-full" />
            ))}
            <span className="sr-only">Loading invitation reports…</span>
          </div>
        ) : null}

        {state.status === "ready" && reports.length === 0 ? (
          <EmptyState
            icon="report"
            title={status ? "No report has this status" : "No invitation reports yet"}
            description={
              status
                ? "Choose another status to see the rest of the report history."
                : "When an active devotee records invitations, the report appears here. Nothing is simulated or pre-filled."
            }
            action={
              status ? (
                <Button variant="secondary" onClick={() => setStatus("")}>
                  Show every report
                </Button>
              ) : null
            }
          />
        ) : null}

        {state.status === "ready" && reports.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-cream/60 text-ink-400 border-line border-b text-[0.6rem] font-bold tracking-[0.12em] uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 sm:px-5">
                      Contributor
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      Locality
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right">
                      Invitations
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      Report date
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right sm:px-5">
                      Review
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-line divide-y">
                  {reports.map((report) => (
                    <tr key={report._id} className="hover:bg-cream/40 transition-colors">
                      <td className="px-4 py-3.5 sm:px-5">
                        <p className="text-bark-900 text-sm font-semibold">
                          {report.contributorId?.fullName ?? "Contributor unavailable"}
                        </p>
                        <p className="text-ink-400 mt-0.5 text-[0.68rem]">
                          {report.contributorId?.email ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-ink-700 text-[0.8rem] font-medium">
                          {report.areaId?.name ?? "Locality unavailable"}
                        </p>
                        <p className="text-ink-400 mt-0.5 text-[0.66rem]">
                          {report.areaId?.type || "Locality"}
                          {report.areaId?.code ? ` · ${report.areaId.code}` : ""}
                        </p>
                      </td>
                      <td className="text-bark-900 px-4 py-3.5 text-right font-semibold tabular-nums">
                        +{formatNumber(Number(report.invitationCount) || 0)}
                      </td>
                      <td className="text-ink-600 px-4 py-3.5 text-[0.78rem] whitespace-nowrap">
                        {formatDate(report.reportDate)}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right sm:px-5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openReview(report)}
                          disabled={!canReview}
                        >
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-line divide-y lg:hidden">
              {reports.map((report) => (
                <li key={report._id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-bark-900 truncate text-sm font-semibold">
                        {report.contributorId?.fullName ?? "Contributor unavailable"}
                      </p>
                      <p className="text-ink-400 mt-0.5 text-[0.68rem]">
                        {report.areaId?.name ?? "Locality unavailable"} ·{" "}
                        {formatDate(report.reportDate)}
                      </p>
                    </div>
                    <StatusBadge status={report.status} />
                  </div>
                  <div className="mt-2.5 flex items-end justify-between gap-3">
                    <p className="text-ink-500 text-[0.74rem] leading-relaxed">
                      {report.description || "No note added by the contributor."}
                    </p>
                    <p className="text-bark-900 shrink-0 text-sm font-semibold tabular-nums">
                      +{formatNumber(Number(report.invitationCount) || 0)}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => openReview(report)}
                    disabled={!canReview}
                  >
                    Review report
                  </Button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      {!canReview ? (
        <Notice tone="info" className="mt-4" title="Read-only report access">
          Your account can read invitation reports but cannot change their status. The review buttons
          remain disabled, and the API refuses the action regardless of the interface.
        </Notice>
      ) : null}

      <p className="text-ink-400 mt-4 text-[0.72rem] leading-relaxed">
        Invitations are never attributed to invitees. Only the contributor, locality, count and date
        are stored. Public coverage counts active reports exactly once.
      </p>

      <Modal
        open={Boolean(reviewTarget)}
        onClose={closeReview}
        title="Review invitation report"
        description={
          reviewTarget
            ? `${reviewTarget.contributorId?.fullName ?? "Contributor"} · ${reviewTarget.areaId?.name ?? "Locality"} · ${formatDate(reviewTarget.reportDate)}`
            : undefined
        }
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeReview} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submitReview} disabled={busy || !canReview}>
              {busy ? "Recording decision…" : "Save decision"}
            </Button>
          </>
        }
      >
        {reviewTarget ? (
          <form onSubmit={submitReview} noValidate className="space-y-5">
            {errors.submit ? (
              <Notice tone="error" title="Decision not recorded">
                {errors.submit}
              </Notice>
            ) : null}

            <div className="border-line rounded-2xl border bg-cream/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-ink-400 text-[0.62rem] font-bold tracking-[0.1em] uppercase">
                    Report
                  </p>
                  <p className="text-bark-900 mt-1 text-lg font-semibold">
                    +{formatNumber(Number(reviewTarget.invitationCount) || 0)} invitations
                  </p>
                </div>
                <StatusBadge status={reviewTarget.status} />
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-ink-400 text-[0.62rem] font-bold tracking-[0.1em] uppercase">
                    Locality
                  </dt>
                  <dd className="text-bark-900 mt-1 text-[0.8rem] font-medium">
                    {reviewTarget.areaId?.name ?? "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-400 text-[0.62rem] font-bold tracking-[0.1em] uppercase">
                    Report date
                  </dt>
                  <dd className="text-bark-900 mt-1 text-[0.8rem] font-medium">
                    {formatDate(reviewTarget.reportDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-400 text-[0.62rem] font-bold tracking-[0.1em] uppercase">
                    Contributor
                  </dt>
                  <dd className="text-bark-900 mt-1 text-[0.8rem] font-medium">
                    {reviewTarget.contributorId?.fullName ?? "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-400 text-[0.62rem] font-bold tracking-[0.1em] uppercase">
                    Submitted
                  </dt>
                  <dd className="text-bark-900 mt-1 text-[0.8rem] font-medium">
                    {formatDateTime(reviewTarget.createdAt)}
                  </dd>
                </div>
              </dl>
              <div className="border-line mt-3 border-t pt-3">
                <p className="text-ink-400 text-[0.62rem] font-bold tracking-[0.1em] uppercase">
                  Contributor note
                </p>
                <p className="text-ink-600 mt-1.5 text-[0.8rem] leading-[1.7] whitespace-pre-wrap">
                  {reviewTarget.description || "No note was provided."}
                </p>
              </div>
              {reviewTarget.adminNotes ? (
                <div className="border-line mt-3 border-t pt-3">
                  <p className="text-ink-400 text-[0.62rem] font-bold tracking-[0.1em] uppercase">
                    Previous reviewer note
                  </p>
                  <p className="text-ink-600 mt-1.5 text-[0.8rem] leading-[1.7] whitespace-pre-wrap">
                    {reviewTarget.adminNotes}
                  </p>
                </div>
              ) : null}
            </div>

            <fieldset>
              <legend className="label-base">Decision</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {DECISIONS.map((option) => {
                  const checked = decision === option.value;
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                        checked ? option.tone : "border-line bg-white hover:bg-cream/60",
                      )}
                    >
                      <input
                        type="radio"
                        name="reportDecision"
                        value={option.value}
                        checked={checked}
                        onChange={() => {
                          setDecision(option.value);
                          setErrors({});
                        }}
                        className="accent-saffron-600 mt-0.5 h-4 w-4 shrink-0"
                      />
                      <span>
                        <span className="text-bark-900 block text-[0.82rem] font-semibold">
                          {option.label}
                        </span>
                        <span className="text-ink-500 mt-0.5 block text-[0.68rem] leading-relaxed">
                          {option.body}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <Field
              id="reportReviewNotes"
              label={decision === "invalid" ? "Audit note (required)" : "Reviewer note (optional)"}
              hint={`${notes.length}/1000`}
              error={errors.notes}
            >
              <TextArea
                id="reportReviewNotes"
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  if (errors.notes || errors.submit) {
                    setErrors((current) => ({ ...current, notes: undefined, submit: undefined }));
                  }
                }}
                rows={3}
                maxLength={1000}
                invalid={Boolean(errors.notes)}
                placeholder={
                  decision === "invalid"
                    ? "Explain what makes this report invalid. This is recorded in the audit log."
                    : "Context for other reviewers. The contributor never sees this note."
                }
              />
            </Field>

            <Notice tone="info" title="What changes publicly">
              Active reports are included in locality coverage. Flagged and invalid reports are
              excluded immediately. Contributor identities are never shown on public pages.
            </Notice>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
