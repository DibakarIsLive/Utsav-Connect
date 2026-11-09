"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminPageHeader from "@/ui/components/admin/AdminPageHeader";
import Badge, { StatusBadge } from "@/ui/components/ui/Badge";
import Notice from "@/ui/components/ui/Notice";
import Skeleton from "@/ui/components/ui/Skeleton";
import Field, { TextArea } from "@/ui/components/ui/Field";
import { Button, ArrowRight } from "@/ui/components/ui/Button";
import { ConfirmDialog } from "@/ui/components/ui/Modal";
import { apiFetch, fieldErrors } from "@/ui/lib/api-client";
import { formatDate, formatDateTime, initials } from "@/ui/lib/format";

const STATUS_COPY = {
  pending: "Awaiting a decision",
  approved: "Approved and active",
  rejected: "Not approved",
};

export default function AdminApplicationDetailClient({ applicationId, canReview }) {
  const [application, setApplication] = useState(null);
  const [state, setState] = useState({ status: "loading", error: null });
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [actionState, setActionState] = useState({ busy: false, error: null, success: null });

  const load = useCallback(async () => {
    setState({ status: "loading", error: null });
    try {
      const data = await apiFetch(`/api/admin/applications/${applicationId}`);
      const record = data?.application ?? null;
      setApplication(record);
      setNote(record?.reviewNote ?? "");
      setState({ status: "ready", error: null });
    } catch (error) {
      setState({ status: "error", error: error.message });
    }
  }, [applicationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitDecision(decision) {
    if (decision === "rejected" && !note.trim()) {
      setNoteError("A short internal reason is required when rejecting an application.");
      document.getElementById("reviewNote")?.focus();
      setDialog(null);
      return;
    }

    setActionState({ busy: true, error: null, success: null });
    try {
      const data = await apiFetch(`/api/admin/applications/${applicationId}/review`, {
        method: "POST",
        body: JSON.stringify({
          status: decision,
          note: note.trim() || undefined,
        }),
      });
      setApplication((current) => ({
        ...current,
        status: data?.application?.status ?? decision,
        reviewedAt: data?.application?.reviewedAt ?? new Date().toISOString(),
        reviewNote: note.trim() || current?.reviewNote,
      }));
      setActionState({
        busy: false,
        error: null,
        success:
          decision === "approved"
            ? "Application approved. The devotee account is now active."
            : "Application rejected. The internal reason has been recorded.",
      });
      setDialog(null);
    } catch (error) {
      const mapped = fieldErrors(error.details);
      setActionState({ busy: false, error: mapped.note || error.message, success: null });
      setDialog(null);
    }
  }

  if (state.status === "loading") {
    return (
      <div>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-4 h-10 w-2/3 max-w-lg" />
        <div className="mt-7 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="card-warm space-y-4 p-6">
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
          <div className="card-warm space-y-4 p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <span className="sr-only">Loading application…</span>
      </div>
    );
  }

  if (state.status === "error" || !application) {
    return (
      <div>
        <AdminPageHeader eyebrow="Applications" title="Application unavailable" />
        <div className="max-w-2xl">
          <Notice tone="error" title="This application could not be loaded">
            {state.error ?? "The application does not exist or is no longer available."}
            <button
              type="button"
              onClick={load}
              className="mt-2 block font-semibold underline underline-offset-2"
            >
              Try again
            </button>
          </Notice>
          <Link
            href="/admin/applications"
            className="text-saffron-700 hover:text-saffron-800 mt-5 inline-flex items-center gap-1.5 text-sm font-semibold"
          >
            Back to applications
          </Link>
        </div>
      </div>
    );
  }

  const pending = application.status === "pending";

  return (
    <div>
      <Link
        href="/admin/applications"
        className="text-ink-400 hover:text-bark-900 inline-flex items-center gap-1.5 text-[0.74rem] font-semibold"
      >
        <span aria-hidden="true">←</span> All applications
      </Link>

      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="bg-bark-900 text-ivory flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-base font-bold">
            {initials(application.applicantName)}
          </span>
          <div>
            <p className="eyebrow text-saffron-700">Application review</p>
            <h1 className="text-bark-900 mt-2 text-[1.9rem] leading-tight font-semibold tracking-[-0.035em] sm:text-[2.3rem]">
              {application.applicantName}
            </h1>
            <p className="text-ink-400 mt-1 text-sm">{application.applicantEmail}</p>
          </div>
        </div>
        <StatusBadge status={application.status}>
          {STATUS_COPY[application.status] ?? application.status}
        </StatusBadge>
      </div>

      {actionState.error ? (
        <Notice tone="error" className="mt-5" title="Decision not recorded">
          {actionState.error}
        </Notice>
      ) : null}
      {actionState.success ? (
        <Notice tone="success" className="mt-5" title="Decision recorded">
          {actionState.success}
        </Notice>
      ) : null}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="card-warm overflow-hidden">
            <div className="border-line border-b px-5 py-4 sm:px-6">
              <h2 className="text-bark-900 text-base font-semibold">Applicant details</h2>
              <p className="text-ink-400 mt-0.5 text-[0.7rem]">
                Contact details are visible only to authorised reviewers.
              </p>
            </div>
            <dl className="divide-line divide-y px-5 sm:px-6">
              {[
                ["Email address", application.applicantEmail],
                ["Phone number", application.applicantPhone],
                [
                  "Gender",
                  application.gender
                    ? application.gender.charAt(0).toUpperCase() + application.gender.slice(1)
                    : "—",
                ],
                ["Submitted", formatDateTime(application.createdAt)],
                [
                  "Reviewed",
                  application.reviewedAt ? formatDateTime(application.reviewedAt) : "Not yet reviewed",
                ],
              ].map(([term, value]) => (
                <div key={term} className="flex flex-wrap items-baseline justify-between gap-3 py-3.5">
                  <dt className="text-ink-400 text-[0.66rem] font-bold tracking-[0.1em] uppercase">
                    {term}
                  </dt>
                  <dd className="text-bark-900 text-right text-sm font-medium break-words">
                    {value || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card-warm p-5 sm:p-6">
            <h2 className="text-bark-900 text-base font-semibold">Applicant&apos;s message</h2>
            {application.message ? (
              <p className="text-ink-600 mt-3 text-sm leading-[1.8] whitespace-pre-wrap">
                {application.message}
              </p>
            ) : (
              <p className="text-ink-400 mt-3 text-sm">No message was provided.</p>
            )}
          </section>

          {application.reviewNote ? (
            <section className="border-line rounded-2xl border bg-cream/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-bark-900 text-sm font-semibold">Internal review note</h2>
                <Badge tone="neutral">Never shown to the applicant</Badge>
              </div>
              <p className="text-ink-600 mt-3 text-sm leading-[1.75] whitespace-pre-wrap">
                {application.reviewNote}
              </p>
            </section>
          ) : null}
        </div>

        <aside className="space-y-5">
          <section className="card-warm p-5 sm:p-6">
            <h2 className="text-bark-900 text-base font-semibold">
              {pending ? "Record a decision" : "Decision recorded"}
            </h2>
            {pending ? (
              <>
                <p className="text-ink-500 mt-1.5 text-[0.78rem] leading-relaxed">
                  Approval activates the account and keeps the application session intact. A
                  rejection requires a short internal reason.
                </p>

                <div className="mt-4">
                  <Field
                    id="reviewNote"
                    label="Internal review note"
                    hint={`${note.length}/1000`}
                    error={noteError}
                  >
                    <TextArea
                      id="reviewNote"
                      value={note}
                      onChange={(event) => {
                        setNote(event.target.value);
                        if (noteError) setNoteError(null);
                      }}
                      rows={4}
                      maxLength={1000}
                      invalid={Boolean(noteError)}
                      placeholder="Context for the review team. Required when rejecting, optional when approving."
                    />
                  </Field>
                  <p className="text-ink-400 mt-2 text-[0.66rem] leading-relaxed">
                    This note is internal. The applicant sees only the decision and its date.
                  </p>
                </div>

                <div className="mt-5 grid gap-2.5">
                  <Button
                    onClick={() => setDialog("approved")}
                    disabled={!canReview || actionState.busy}
                  >
                    Approve application <ArrowRight />
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (!note.trim()) {
                        setNoteError(
                          "A short internal reason is required when rejecting an application.",
                        );
                        document.getElementById("reviewNote")?.focus();
                        return;
                      }
                      setDialog("rejected");
                    }}
                    disabled={!canReview || actionState.busy}
                  >
                    Reject application
                  </Button>
                </div>

                {!canReview ? (
                  <p className="text-ink-400 mt-3 text-[0.68rem] leading-relaxed">
                    Your account has read-only access to applications, so decisions are disabled.
                  </p>
                ) : null}
              </>
            ) : (
              <div className="mt-3">
                <p className="text-ink-500 text-sm leading-relaxed">
                  {application.status === "approved"
                    ? "This applicant was approved. Their account is active and can report invitations."
                    : "This application was rejected. The applicant can still sign in to see the recorded decision, but cannot report invitations."}
                </p>
                <p className="text-ink-400 mt-3 text-[0.72rem]">
                  Reviewed {formatDate(application.reviewedAt)}
                </p>
                <Link
                  href="/admin/applications"
                  className="text-saffron-700 hover:text-saffron-800 mt-5 inline-flex items-center gap-1.5 text-sm font-semibold"
                >
                  Return to the queue <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </section>

          <div className="border-line rounded-2xl border bg-white/60 p-5">
            <h2 className="text-bark-900 text-sm font-semibold">What the applicant sees</h2>
            <ul className="text-ink-500 mt-3 space-y-2.5 text-[0.76rem] leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="bg-saffron-600 mt-1.5 h-1 w-1 shrink-0 rounded-full" />
                The decision status and its date.
              </li>
              <li className="flex items-start gap-2.5">
                <span className="bg-saffron-600 mt-1.5 h-1 w-1 shrink-0 rounded-full" />
                Their own application details and message.
              </li>
              <li className="flex items-start gap-2.5">
                <span className="bg-saffron-600 mt-1.5 h-1 w-1 shrink-0 rounded-full" />
                Never this internal note, your identity, or another applicant&apos;s data.
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(dialog)}
        onClose={() => setDialog(null)}
        onConfirm={() => submitDecision(dialog)}
        loading={actionState.busy}
        destructive={dialog === "rejected"}
        title={dialog === "rejected" ? "Reject this application?" : "Approve this application?"}
        description={
          dialog === "rejected"
            ? "The applicant will see a rejected decision. The internal reason stays private, and the action is written to the audit log."
            : "Approval activates the devotee account immediately. The action is written to the audit log."
        }
        confirmLabel={dialog === "rejected" ? "Reject application" : "Approve application"}
      >
        <p className="text-ink-600 text-sm leading-relaxed">
          {application.applicantName} · {application.applicantEmail}
        </p>
      </ConfirmDialog>
    </div>
  );
}
