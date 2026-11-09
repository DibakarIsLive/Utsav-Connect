"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Badge, { StatusBadge } from "@/ui/components/ui/Badge";
import Notice from "@/ui/components/ui/Notice";
import Skeleton from "@/ui/components/ui/Skeleton";
import EmptyState from "@/ui/components/ui/EmptyState";
import { ButtonLink, ArrowRight } from "@/ui/components/ui/Button";
import { useSession } from "@/ui/components/providers/SessionProvider";
import { apiFetch } from "@/ui/lib/api-client";
import { formatDate, formatDateTime, initials } from "@/ui/lib/format";

const STATUS_COPY = {
  pending_verification: {
    label: "Awaiting email verification",
    tone: "warning",
    title: "Check your inbox to continue.",
    body: "Your application is saved. Verify your email address to move it into administrative review. If the message has not arrived, check your spam folder.",
  },
  pending_approval: {
    label: "In administrative review",
    tone: "info",
    title: "Your application is with the reviewers.",
    body: "Your email is verified and the application is waiting for an administrator. Every application is read personally, so this can take a little time.",
  },
  active: {
    label: "Approved and active",
    tone: "success",
    title: "Welcome to the outreach.",
    body: "Your account is active. You can record invitation reports, propose localities you know, and use the full devotee dashboard.",
  },
  rejected: {
    label: "Not approved",
    tone: "error",
    title: "This application was not approved.",
    body: "The reviewing team has recorded its decision. Internal review notes are not published, so please contact the Mahotsav committee if you need guidance.",
  },
  suspended: {
    label: "Account suspended",
    tone: "error",
    title: "This account is suspended.",
    body: "Access has been paused by an administrator. Please contact the campaign team if you believe this is a mistake.",
  },
};

function Timeline({ application, user }) {
  const reviewed = application?.status === "approved" || application?.status === "rejected";
  const steps = [
    {
      title: "Application received",
      state: "done",
      detail: application?.createdAt ? formatDateTime(application.createdAt) : "Recorded",
    },
    {
      title: "Email verified",
      state: user.emailVerified ? "done" : "current",
      detail: user.emailVerified ? "Confirmed" : "Waiting for you to open the verification link",
    },
    {
      title: "Administrative review",
      state: reviewed ? "done" : user.emailVerified ? "current" : "pending",
      detail: reviewed
        ? application?.reviewedAt
          ? formatDateTime(application.reviewedAt)
          : "Reviewed"
        : "A person reviews every application",
    },
    {
      title: application?.status === "rejected" ? "Decision recorded" : "Decision",
      state: reviewed ? "done" : "pending",
      detail:
        application?.status === "approved"
          ? "Approved"
          : application?.status === "rejected"
            ? "Not approved"
            : "Pending",
    },
  ];

  return (
    <ol className="space-y-0">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
            {!last ? (
              <span
                aria-hidden="true"
                className={`absolute top-7 bottom-0 left-[0.68rem] w-px ${
                  step.state === "done" ? "bg-emerald-300" : "bg-line"
                }`}
              />
            ) : null}
            <span
              className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                step.state === "done"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : step.state === "current"
                    ? "border-saffron-500 bg-saffron-50 text-saffron-700"
                    : "border-line bg-white text-ink-300"
              }`}
            >
              {step.state === "done" ? (
                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden="true">
                  <path
                    d="m3.5 8 3 3 6-6.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <span className="text-[0.55rem] font-bold">{String(index + 1).padStart(2, "0")}</span>
              )}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-bark-900 text-sm font-semibold">{step.title}</p>
              <p className="text-ink-400 mt-1 text-[0.72rem] leading-relaxed">{step.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function ApplicationStatusClient() {
  const router = useRouter();
  const { user, loading, signOut } = useSession();
  const [application, setApplication] = useState(null);
  const [state, setState] = useState({ status: "idle", error: null });

  const load = useCallback(async () => {
    setState({ status: "loading", error: null });
    try {
      const data = await apiFetch("/api/account/application");
      setApplication(data?.application ?? null);
      setState({ status: "ready", error: null });
    } catch (error) {
      setState({ status: "error", error: error.message });
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/apply?mode=login");
      return;
    }
    if (user.role === "admin" || user.role === "super_admin") {
      router.replace("/admin");
      return;
    }
    load();
  }, [loading, user, router, load]);

  if (loading || state.status === "loading" || (!user && state.status !== "error")) {
    return (
      <div className="shell py-16">
        <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="card-paper p-8">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-5 h-10 w-3/4" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
            <div className="mt-8 space-y-5">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </div>
          <div className="card-paper p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const copy = STATUS_COPY[user.status] ?? {
    label: user.status?.replaceAll("_", " ") ?? "Unknown",
    tone: "info",
    title: "Your application status",
    body: "The campaign team has recorded a status for this account.",
  };

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="bg-cream pattern-contour relative overflow-hidden">
      <div className="shell relative py-12 sm:py-16">
        <div className="grid items-start gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:gap-8">
          <div className="space-y-6">
            <div className="card-paper overflow-hidden">
              <div className="bg-bark-950 text-ivory relative overflow-hidden px-6 py-8 sm:px-9 sm:py-10">
                <div className="pattern-jaali absolute inset-0 opacity-[0.14]" aria-hidden="true" />
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={user.status}>{copy.label}</StatusBadge>
                    {user.emailVerified ? (
                      <Badge tone="green">Email verified</Badge>
                    ) : (
                      <Badge tone="amber">Email not verified</Badge>
                    )}
                  </div>
                  <h1 className="mt-5 max-w-xl text-[2.1rem] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[2.7rem]">
                    {copy.title}
                  </h1>
                  <p className="text-ivory/65 mt-4 max-w-xl text-[0.95rem] leading-[1.8]">
                    {copy.body}
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-9">
                {state.status === "error" ? (
                  <div className="mb-6">
                    <Notice tone="error" title="Could not load your application">
                      {state.error}
                      <button
                        type="button"
                        onClick={load}
                        className="text-saffron-800 mt-2 block font-semibold underline underline-offset-2"
                      >
                        Try again
                      </button>
                    </Notice>
                  </div>
                ) : null}

                {state.status === "ready" && !application ? (
                  <EmptyState
                    icon="report"
                    title="No current application found"
                    description="This account does not have an application on record. If you believe this is incorrect, contact the campaign administrators."
                    action={
                      <ButtonLink href="/apply" variant="secondary">
                        Return to application page
                      </ButtonLink>
                    }
                  />
                ) : null}

                {application ? (
                  <div className="grid gap-8 md:grid-cols-[1fr_1fr]">
                    <div>
                      <p className="eyebrow text-saffron-700">Your progress</p>
                      <div className="mt-5">
                        <Timeline application={application} user={user} />
                      </div>
                    </div>

                    <div>
                      <p className="eyebrow text-saffron-700">Application details</p>
                      <dl className="divide-line mt-4 divide-y">
                        {[
                          ["Full name", application.applicantName],
                          ["Email", application.applicantEmail],
                          ["Phone", application.applicantPhone],
                          [
                            "Gender",
                            application.gender
                              ? application.gender.charAt(0).toUpperCase() +
                                application.gender.slice(1)
                              : "—",
                          ],
                          ["Submitted", formatDate(application.createdAt)],
                          [
                            "Decision recorded",
                            application.reviewedAt ? formatDate(application.reviewedAt) : "Pending",
                          ],
                        ].map(([term, value]) => (
                          <div key={term} className="flex items-baseline justify-between gap-4 py-3 first:pt-0">
                            <dt className="text-ink-400 text-[0.68rem] font-bold tracking-[0.1em] uppercase">
                              {term}
                            </dt>
                            <dd className="text-bark-900 max-w-[60%] text-right text-sm font-medium break-words">
                              {value || "—"}
                            </dd>
                          </div>
                        ))}
                      </dl>

                      {application.message ? (
                        <div className="mt-6 rounded-2xl bg-cream p-4">
                          <p className="text-ink-400 text-[0.64rem] font-bold tracking-[0.12em] uppercase">
                            Your message
                          </p>
                          <p className="text-ink-600 mt-2 text-sm leading-[1.75] whitespace-pre-wrap">
                            {application.message}
                          </p>
                        </div>
                      ) : null}

                      <p className="text-ink-400 mt-6 text-[0.7rem] leading-relaxed">
                        For privacy, internal review notes and reviewer identities are never shown
                        here. Decisions are recorded in the platform&apos;s audit log.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="border-line mt-8 flex flex-wrap items-center gap-3 border-t pt-6">
                  {user.status === "active" ? (
                    <ButtonLink href="/dashboard" size="lg">
                      Open my dashboard <ArrowRight />
                    </ButtonLink>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-ink-400 hover:text-bark-900 ml-auto text-xs font-semibold"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>

            {user.status === "pending_verification" ? (
              <Notice tone="warning" title="Verification link not arriving?">
                Check your spam folder first. Email delivery is handled by the campaign team; if the
                problem continues, contact the administrators through the official Satsang website.
              </Notice>
            ) : null}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-28">
            <div className="card-warm p-6">
              <div className="flex items-center gap-3">
                <span className="bg-bark-900 flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-ivory">
                  {initials(user.fullName)}
                </span>
                <div className="min-w-0">
                  <p className="text-bark-900 truncate text-sm font-semibold">{user.fullName}</p>
                  <p className="text-ink-400 truncate text-[0.72rem]">{user.email}</p>
                </div>
              </div>
              <div className="border-line mt-5 border-t pt-4">
                <p className="text-ink-400 text-[0.64rem] font-bold tracking-[0.12em] uppercase">
                  Account
                </p>
                <p className="text-ink-600 mt-2 text-[0.78rem] leading-relaxed">
                  Signed in with application-level access. Approval adds reporting and proposal
                  tools without creating a new account.
                </p>
              </div>
            </div>

            <div className="card-warm p-6">
              <p className="eyebrow text-saffron-700">While you wait</p>
              <ul className="mt-4 space-y-4">
                {[
                  ["Learn about the platform", "Read how Utsav-Connect works and how to apply.", "/about"],
                  ["Understand the process", "Read exactly how review, approval and coverage work.", "/about"],
                ].map(([title, body, href]) => (
                  <li key={href}>
                    <Link href={href} className="group block">
                      <p className="text-bark-900 group-hover:text-saffron-700 text-sm font-semibold transition-colors">
                        {title}
                      </p>
                      <p className="text-ink-500 mt-1 text-[0.76rem] leading-relaxed">{body}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-line bg-white/60 p-5">
              <p className="text-ink-500 text-[0.76rem] leading-relaxed">
                Need a correction to your application? Contact the Mahotsav committee through the{" "}
                <a
                  href="https://www.satsang.org.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-saffron-700 font-semibold underline underline-offset-2"
                >
                  official Satsang website
                </a>
                .
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
