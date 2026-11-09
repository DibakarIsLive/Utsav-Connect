"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
  { value: "", label: "All proposals" },
  { value: "pending", label: "Pending" },
  { value: "needs_correction", label: "Needs correction" },
  { value: "approved", label: "Approved" },
  { value: "duplicate", label: "Duplicate" },
  { value: "rejected", label: "Rejected" },
];

const DECISIONS = [
  {
    value: "approved",
    label: "Approve",
    body: "Create an official approved area from this proposal.",
    tone: "border-emerald-300 bg-emerald-50",
  },
  {
    value: "needs_correction",
    label: "Request correction",
    body: "Send the proposer a clear, specific correction request.",
    tone: "border-amber-300 bg-amber-50",
  },
  {
    value: "duplicate",
    label: "Mark duplicate",
    body: "Record that this place already exists elsewhere in the map.",
    tone: "border-sky-300 bg-sky-50",
  },
  {
    value: "rejected",
    label: "Decline",
    body: "Close the proposal without creating an area.",
    tone: "border-red-300 bg-red-50",
  },
];

const CONFIDENCE_TONE = { high: "red", medium: "amber", low: "neutral" };

export default function AdminProposalsClient() {
  const [proposals, setProposals] = useState([]);
  const [status, setStatus] = useState("");
  const [state, setState] = useState({ status: "loading", error: null });
  const [reviewTarget, setReviewTarget] = useState(null);
  const [decision, setDecision] = useState("approved");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setState({ status: "loading", error: null });
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const data = await apiFetch(`/api/admin/areas/proposals?${params.toString()}`);
      setProposals(data?.proposals ?? []);
      setState({ status: "ready", error: null });
    } catch (error) {
      setState({ status: "error", error: error.message });
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  function openReview(proposal) {
    setReviewTarget(proposal);
    setDecision("approved");
    setNotes("");
    setConfirmed(false);
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
    if (decision === "approved" && !confirmed) {
      nextErrors.confirmed = "Confirm that approval creates a public official area.";
    }
    if (decision === "needs_correction" && !notes.trim()) {
      nextErrors.notes = "Tell the proposer what needs correcting.";
    }
    if ((decision === "rejected" || decision === "duplicate") && !notes.trim()) {
      nextErrors.notes = "Record a short reason for the review team.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      if (nextErrors.notes) document.getElementById("proposalReviewNotes")?.focus();
      return;
    }

    setBusy(true);
    setErrors({});
    try {
      const data = await apiFetch(`/api/admin/areas/proposals/${reviewTarget._id}/review`, {
        method: "POST",
        body: JSON.stringify({
          status: decision,
          reviewNotes: notes.trim() || undefined,
          correctionNotes: decision === "needs_correction" ? notes.trim() : undefined,
        }),
      });
      setNotice({
        tone: "success",
        title: "Proposal reviewed",
        body:
          decision === "approved"
            ? `${reviewTarget.name} is now an approved area${data?.createdArea?.name ? `: ${data.createdArea.name}` : ""}. It is public immediately.`
            : `${reviewTarget.name} is marked as ${decision.replaceAll("_", " ")}.`,
      });
      setReviewTarget(null);
      await load();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setBusy(false);
    }
  }

  const pendingCount = proposals.filter((proposal) => proposal.status === "pending").length;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Locality proposals"
        title="Leads from the community, reviewed with care."
        description="A proposal is not an area. Read the local context, check every duplicate warning, and only then decide whether it joins the official map."
        actions={
          <Badge tone={pendingCount > 0 ? "amber" : "neutral"}>
            {state.status === "ready" ? `${formatNumber(pendingCount)} pending` : "Live queue"}
          </Badge>
        }
      />

      {notice ? (
        <Notice tone={notice.tone} className="mb-4" title={notice.title}>
          {notice.body}
        </Notice>
      ) : null}

      <div className="border-line shadow-soft rounded-2xl border bg-white">
        <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h2 className="text-bark-900 text-sm font-semibold">Proposal queue</h2>
            <p className="text-ink-400 mt-0.5 text-[0.7rem]">
              Pending proposals never appear on the public map or in coverage totals.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="proposalStatus" className="sr-only">
              Filter proposals by status
            </label>
            <select
              id="proposalStatus"
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
              Refresh
            </Button>
          </div>
        </div>

        {state.status === "error" ? (
          <div className="p-4">
            <Notice tone="error" title="Proposals could not be loaded">
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
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
            <span className="sr-only">Loading proposals…</span>
          </div>
        ) : null}

        {state.status === "ready" && proposals.length === 0 ? (
          <EmptyState
            icon="compass"
            title={status ? "No proposal has this status" : "No proposals yet"}
            description={
              status
                ? "Choose another status to see the rest of the review history."
                : "When a devotee proposes a locality, it appears here with its context and duplicate warnings. No proposal is placed on the map automatically."
            }
            action={
              status ? (
                <Button variant="secondary" onClick={() => setStatus("")}>
                  Show every proposal
                </Button>
              ) : null
            }
          />
        ) : null}

        {state.status === "ready" && proposals.length > 0 ? (
          <ul className="divide-line divide-y">
            {proposals.map((proposal) => {
              const parentName =
                typeof proposal.parentId === "object" && proposal.parentId
                  ? proposal.parentId.name
                  : null;
              return (
                <li key={proposal._id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-bark-900 text-sm font-semibold">{proposal.name}</p>
                        {proposal.duplicates?.length ? (
                          <Badge tone="red">
                            {proposal.duplicates.length} possible duplicate
                            {proposal.duplicates.length === 1 ? "" : "s"}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-ink-400 mt-1 text-[0.7rem]">
                        {proposal.type || "Locality"}
                        {parentName ? ` · under ${parentName}` : ""}
                        {proposal.formattedAddress ? ` · ${proposal.formattedAddress}` : ""}
                      </p>
                      <p className="text-ink-400 mt-1 text-[0.68rem]">
                        Proposed by {proposal.proposerName} · {formatDate(proposal.createdAt)}
                        {proposal.location?.coordinates
                          ? " · point recorded"
                          : proposal.boundary?.coordinates
                            ? " · boundary recorded"
                            : " · no geometry"}
                      </p>
                      {proposal.status === "needs_correction" && proposal.correctionNotes ? (
                        <p className="text-amber-800 mt-2 max-w-2xl text-[0.74rem] leading-relaxed">
                          Correction request: {proposal.correctionNotes}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <StatusBadge status={proposal.status} />
                      <Button size="sm" variant="secondary" onClick={() => openReview(proposal)}>
                        Review <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <p className="text-ink-400 mt-4 text-[0.72rem] leading-relaxed">
        Approving a proposal creates a new approved area. Duplicate warnings are advisory; nothing is
        merged or deleted automatically. See the{" "}
        <Link href="/admin/areas" className="text-saffron-700 font-semibold underline underline-offset-2">
          official area list
        </Link>{" "}
        before deciding.
      </p>

      <Modal
        open={Boolean(reviewTarget)}
        onClose={closeReview}
        title={reviewTarget ? `Review: ${reviewTarget.name}` : "Review proposal"}
        description={
          reviewTarget
            ? `Proposed by ${reviewTarget.proposerName}. Approval creates a public official area.`
            : undefined
        }
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeReview} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submitReview} disabled={busy}>
              {busy ? "Recording decision…" : "Submit decision"}
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
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-ink-400 text-[0.62rem] font-bold tracking-[0.1em] uppercase">
                    Type
                  </dt>
                  <dd className="text-bark-900 mt-1 text-[0.8rem] font-medium">
                    {reviewTarget.type || "Locality"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-400 text-[0.62rem] font-bold tracking-[0.1em] uppercase">
                    Parent
                  </dt>
                  <dd className="text-bark-900 mt-1 text-[0.8rem] font-medium">
                    {typeof reviewTarget.parentId === "object" && reviewTarget.parentId
                      ? reviewTarget.parentId.name
                      : "Top level"}
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
                <div>
                  <dt className="text-ink-400 text-[0.62rem] font-bold tracking-[0.1em] uppercase">
                    Geometry
                  </dt>
                  <dd className="text-bark-900 mt-1 text-[0.8rem] font-medium">
                    {reviewTarget.boundary?.coordinates
                      ? "Boundary recorded"
                      : reviewTarget.location?.coordinates
                        ? "Point recorded"
                        : "None recorded"}
                  </dd>
                </div>
              </dl>
              {reviewTarget.formattedAddress ? (
                <p className="text-ink-500 mt-3 text-[0.78rem] leading-relaxed">
                  {reviewTarget.formattedAddress}
                </p>
              ) : null}
              {reviewTarget.notes ? (
                <div className="border-line mt-3 border-t pt-3">
                  <p className="text-ink-400 text-[0.62rem] font-bold tracking-[0.1em] uppercase">
                    Proposer&apos;s context
                  </p>
                  <p className="text-ink-600 mt-1.5 text-[0.8rem] leading-[1.7] whitespace-pre-wrap">
                    {reviewTarget.notes}
                  </p>
                </div>
              ) : null}
            </div>

            {reviewTarget.duplicates?.length ? (
              <Notice tone="warning" title="Check these possible duplicates first">
                <ul className="mt-1 space-y-2">
                  {reviewTarget.duplicates.map((duplicate, index) => (
                    <li
                      key={`${duplicate.areaId}-${index}`}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <strong>{duplicate.areaName}</strong>
                      <Badge tone={CONFIDENCE_TONE[duplicate.confidence] ?? "neutral"}>
                        {duplicate.confidence} confidence
                      </Badge>
                      <span className="text-ink-500">— {duplicate.reason}</span>
                    </li>
                  ))}
                </ul>
              </Notice>
            ) : (
              <p className="text-ink-400 text-[0.72rem]">
                No automatic duplicate warning was recorded for this proposal. This is advisory, not
                proof that the locality is unique.
              </p>
            )}

            <fieldset>
              <legend className="label-base">Decision</legend>
              <div className="grid gap-2 sm:grid-cols-2">
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
                        name="proposalDecision"
                        value={option.value}
                        checked={checked}
                        onChange={() => {
                          setDecision(option.value);
                          setConfirmed(false);
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
              id="proposalReviewNotes"
              label={
                decision === "needs_correction"
                  ? "Correction request (shown to the proposer)"
                  : decision === "approved"
                    ? "Review note (internal, optional)"
                    : "Reason (internal)"
              }
              hint={`${notes.length}/2000`}
              error={errors.notes}
            >
              <TextArea
                id="proposalReviewNotes"
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  if (errors.notes || errors.submit) {
                    setErrors((current) => ({ ...current, notes: undefined, submit: undefined }));
                  }
                }}
                rows={3}
                maxLength={2000}
                invalid={Boolean(errors.notes)}
                placeholder={
                  decision === "needs_correction"
                    ? "Explain exactly what the proposer should add or correct."
                    : "Context for the review team."
                }
              />
            </Field>

            {decision === "approved" ? (
              <div className="border-line rounded-2xl border bg-white p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => {
                      setConfirmed(event.target.checked);
                      if (errors.confirmed) {
                        setErrors((current) => ({ ...current, confirmed: undefined }));
                      }
                    }}
                    className="accent-saffron-600 mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span className="text-ink-600 text-[0.76rem] leading-relaxed">
                    I understand approval creates a new <strong>public approved area</strong> using
                    this proposal&apos;s name, type, parent and recorded geometry. It can receive
                    reports immediately.
                  </span>
                </label>
                {errors.confirmed ? (
                  <p role="alert" className="mt-2 text-xs font-medium text-red-700">
                    {errors.confirmed}
                  </p>
                ) : null}
              </div>
            ) : null}

            {reviewTarget.status === "approved" ? (
              <Notice tone="info" title="Already approved">
                This proposal has already created an official area. Further decisions are disabled by
                the API.
              </Notice>
            ) : null}
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
