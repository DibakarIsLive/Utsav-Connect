"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Badge, { StatusBadge } from "@/ui/components/ui/Badge";
import Notice from "@/ui/components/ui/Notice";
import EmptyState from "@/ui/components/ui/EmptyState";
import StatCard from "@/ui/components/ui/StatCard";
import { Button, ButtonLink, ArrowRight } from "@/ui/components/ui/Button";
import { LotusDivider } from "@/ui/components/ui/Ornament";
import { useSession } from "@/ui/components/providers/SessionProvider";
import SubmitReportModal from "@/ui/components/invitations/SubmitReportModal";
import ReportHistoryTable from "@/ui/components/invitations/ReportHistoryTable";
import ProposeAreaModal from "@/ui/components/maps/ProposeAreaModal";
import { apiFetch } from "@/ui/lib/api-client";
import { formatDate, formatNumber, initials } from "@/ui/lib/format";
import { cn } from "@/ui/lib/cn";

const MONTH_FORMAT = new Intl.DateTimeFormat("en-IN", { month: "short" });

function monthKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildRecentMonths(reports) {
  const now = new Date();
  const months = [];
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, label: MONTH_FORMAT.format(date), total: 0 });
  }
  const byKey = new Map(months.map((month) => [month.key, month]));
  for (const report of reports) {
    if (report.status !== "active") continue;
    const key = monthKey(report.reportDate);
    const month = key ? byKey.get(key) : null;
    if (month) month.total += Number(report.invitationCount) || 0;
  }
  return months;
}

function StatIcon({ children }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function SidebarCard({ title, description, children, className = "" }) {
  return (
    <section className={cn("card-warm p-5", className)}>
      <h2 className="text-bark-900 text-base font-semibold">{title}</h2>
      {description ? (
        <p className="text-ink-400 mt-1 text-[0.72rem] leading-relaxed">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function DashboardClient({
  initialUser,
  initialReports = [],
  initialAreas = [],
  initialProposals = [],
  initialAnalytics = [],
  initialError = null,
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { signOut } = useSession();

  const [reports, setReports] = useState(initialReports);
  const [areas, setAreas] = useState(initialAreas);
  const [proposals, setProposals] = useState(initialProposals);
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [dataError, setDataError] = useState(initialError);
  const [refreshing, setRefreshing] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    setDataError(null);
    try {
      const [reportData, coverageData, proposalData, areaData] = await Promise.all([
        apiFetch("/api/invitations"),
        apiFetch("/api/analytics/coverage"),
        apiFetch("/api/areas/proposals"),
        apiFetch("/api/areas"),
      ]);
      setReports(reportData?.reports ?? []);
      setAnalytics(coverageData?.analytics ?? []);
      setProposals(proposalData?.proposals ?? []);
      setAreas(areaData?.areas ?? []);
    } catch (error) {
      setDataError(error.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const activeReports = useMemo(
    () => reports.filter((report) => report.status === "active"),
    [reports],
  );

  const stats = useMemo(() => {
    const invitations = activeReports.reduce(
      (sum, report) => sum + (Number(report.invitationCount) || 0),
      0,
    );
    const areaIds = new Set(
      activeReports
        .map((report) => {
          const area = report.areaId;
          if (!area) return null;
          return typeof area === "object" ? (area._id ?? area.id) : area;
        })
        .filter(Boolean),
    );
    return {
      invitations,
      reports: reports.length,
      areas: areaIds.size,
      proposals: proposals.length,
    };
  }, [activeReports, reports, proposals]);

  const localities = useMemo(() => {
    const map = new Map();
    for (const report of activeReports) {
      const area = report.areaId;
      const id = typeof area === "object" && area ? (area._id ?? area.id) : area;
      if (!id) continue;
      const entry = map.get(id) ?? {
        id,
        name: typeof area === "object" && area ? area.name : "Locality unavailable",
        type: typeof area === "object" && area ? area.type : "Locality",
        total: 0,
        reportCount: 0,
      };
      entry.total += Number(report.invitationCount) || 0;
      entry.reportCount += 1;
      map.set(id, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [activeReports]);

  const coverageById = useMemo(() => {
    const map = new Map();
    for (const entry of analytics) map.set(entry.areaId, entry);
    return map;
  }, [analytics]);

  const months = useMemo(() => buildRecentMonths(reports), [reports]);
  const monthMax = Math.max(1, ...months.map((month) => month.total));

  const firstName = String(initialUser.fullName ?? "").trim().split(/\s+/)[0] || "friend";

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  const dataUnavailable = Boolean(dataError);

  return (
    <div className="bg-cream relative overflow-hidden">
      <div className="pattern-contour absolute inset-0 opacity-50" aria-hidden="true" />

      <section className="bg-bark-950 text-ivory relative overflow-hidden">
        <div className="pattern-jaali absolute inset-0 opacity-[0.13]" aria-hidden="true" />
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-saffron-600/15 blur-3xl" aria-hidden="true" />
        <div className="shell relative pt-12 pb-20 sm:pt-16 sm:pb-24">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"
          >
            <div>
              <p className="eyebrow text-gold-300 flex items-center gap-3">
                <span className="bg-gold-400/70 h-px w-8" aria-hidden="true" />
                Devotee workspace
              </p>
              <h1 className="mt-5 max-w-2xl text-[2.4rem] leading-[1.02] font-semibold tracking-[-0.045em] sm:text-[3.3rem]">
                Jai Guru, <span className="text-gold-300 italic">{firstName}.</span>
              </h1>
              <p className="text-ivory/60 mt-5 max-w-xl text-[0.98rem] leading-[1.8]">
                This is your private view of the outreach: every invitation you have recorded, the
                localities you have reached, and the proposals you have shared. Your reports help the
                whole campaign see itself clearly.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                <Badge tone="dark" dot>
                  Approved devotee
                </Badge>
                <Badge tone="dark">
                  {initialUser.emailVerified ? "Email verified" : "Email not verified"}
                </Badge>
                {initialUser.createdAt ? (
                  <span className="text-ivory/40 text-[0.68rem]">
                    Member since {formatDate(initialUser.createdAt)}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => setReportOpen(true)}
                disabled={areas.length === 0}
              >
                Record invitations <ArrowRight />
              </Button>
              <Button variant="outline-light" size="lg" onClick={() => setProposalOpen(true)}>
                Propose a locality
              </Button>
            </div>
          </motion.div>
        </div>
        <div className="absolute right-0 bottom-0 left-0 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
      </section>

      <div className="shell relative -mt-12 pb-20">
        {dataUnavailable ? (
          <Notice tone="error" className="mb-5" title="Workspace data is unavailable">
            {dataError}{" "}
            <button
              type="button"
              onClick={refreshData}
              className="font-semibold underline underline-offset-2"
            >
              Try again
            </button>
          </Notice>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Invitations in public totals",
              value: dataUnavailable ? "—" : formatNumber(stats.invitations),
              detail: "Active reports only; flagged and invalid excluded",
              icon: (
                <StatIcon>
                  <path
                    d="M4 6.5h16v11H4v-11Zm0 4h16M8 6.5v11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </StatIcon>
              ),
            },
            {
              label: "Reports submitted",
              value: dataUnavailable ? "—" : formatNumber(stats.reports),
              detail: "Every report stays private to you",
              icon: (
                <StatIcon>
                  <path
                    d="M6 3.8h9l3 3V20H6V3.8Zm3 5h6m-6 4h6m-6 4h3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </StatIcon>
              ),
            },
            {
              label: "Localities reached",
              value: dataUnavailable ? "—" : formatNumber(stats.areas),
              detail: "Distinct approved areas with active reports",
              icon: (
                <StatIcon>
                  <path
                    d="M9 3 3.8 5.1v15.4L9 18.4l6 2.1 5.2-2.1V3.1L15 5.2 9 3Zm0 0v15.4m6-13.2v15.3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </StatIcon>
              ),
            },
            {
              label: "Proposals shared",
              value: dataUnavailable ? "—" : formatNumber(stats.proposals),
              detail: "Pending proposals do not affect the map",
              icon: (
                <StatIcon>
                  <path
                    d="M12 3.5 4.8 6.8v5.1c0 4.2 3 7.8 7.2 9.1 4.2-1.3 7.2-4.9 7.2-9.1V6.8L12 3.5Zm-2.7 8.6 1.9 1.9 3.6-3.8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </StatIcon>
              ),
            },
          ].map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">
            <div className="table-shell">
              <ReportHistoryTable
                reports={reports}
                action={
                  <Button onClick={() => setReportOpen(true)} disabled={areas.length === 0}>
                    Record your first report
                  </Button>
                }
              />
            </div>

            <section className="table-shell">
              <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b bg-cream/50 px-4 py-3.5 sm:px-5">
                <div>
                  <h2 className="text-bark-900 text-base font-semibold">Your locality proposals</h2>
                  <p className="text-ink-400 mt-0.5 text-[0.7rem]">
                    A proposal becomes an approved area only after administrative review.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setProposalOpen(true)}>
                  Propose another
                </Button>
              </div>

              {proposals.length === 0 ? (
                <EmptyState
                  icon="map"
                  className="border-0 shadow-none"
                  title="No proposals yet"
                  description="Know a locality that is missing from the map? Propose it with the context only you can offer. It stays pending and private until a reviewer decides."
                  action={
                    <Button variant="secondary" onClick={() => setProposalOpen(true)}>
                      Propose a locality
                    </Button>
                  }
                />
              ) : (
                <ul className="divide-line divide-y">
                  {proposals.map((proposal) => {
                    const parentName =
                      typeof proposal.parentId === "object" && proposal.parentId
                        ? proposal.parentId.name
                        : null;
                    return (
                      <li
                        key={proposal._id}
                        className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5 sm:px-5"
                      >
                        <div className="min-w-0">
                          <p className="text-bark-900 text-sm font-semibold">{proposal.name}</p>
                          <p className="text-ink-400 mt-0.5 text-[0.68rem]">
                            {proposal.type || "Locality"}
                            {parentName ? ` · under ${parentName}` : ""}
                            {proposal.createdAt ? ` · ${formatDate(proposal.createdAt)}` : ""}
                          </p>
                          {proposal.status === "needs_correction" && proposal.correctionNotes ? (
                            <p className="text-ink-500 mt-1.5 max-w-lg text-[0.74rem] leading-relaxed">
                              Correction requested: {proposal.correctionNotes}
                            </p>
                          ) : null}
                        </div>
                        <StatusBadge status={proposal.status} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <div className="border-line flex flex-col items-start justify-between gap-4 rounded-3xl border bg-white/70 px-5 py-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-bark-900 text-sm font-semibold">See the whole picture</p>
                <p className="text-ink-500 mt-1 text-[0.78rem] leading-relaxed">
                  Your reports feed the public coverage figures for the localities you reached.
                </p>
              </div>

            </div>
          </div>

          <aside className="space-y-5">
            <section className="card-warm overflow-hidden">
              <div className="bg-bark-950 text-ivory relative overflow-hidden px-5 py-5">
                <div className="pattern-jaali absolute inset-0 opacity-[0.14]" aria-hidden="true" />
                <div className="relative flex items-center gap-3.5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-400 text-sm font-bold text-bark-950">
                    {initials(initialUser.fullName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{initialUser.fullName}</p>
                    <p className="text-ivory/50 truncate text-[0.72rem]">{initialUser.email}</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <dl className="divide-line divide-y text-sm">
                  {[
                    ["Status", "Active devotee"],
                    ["Joined", initialUser.createdAt ? formatDate(initialUser.createdAt) : "—"],
                    ["Last sign in", initialUser.lastLoginAt ? formatDate(initialUser.lastLoginAt) : "—"],
                  ].map(([term, value]) => (
                    <div key={term} className="flex items-baseline justify-between gap-3 py-2 first:pt-0">
                      <dt className="text-ink-400 text-[0.64rem] font-bold tracking-[0.1em] uppercase">
                        {term}
                      </dt>
                      <dd className="text-bark-900 text-right text-[0.78rem] font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
                <LotusDivider className="my-4" />
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-ink-400 hover:text-bark-900 w-full text-left text-[0.72rem] font-semibold"
                >
                  Sign out of this device
                </button>
              </div>
            </section>

            <SidebarCard
              title="Localities you reached"
              description="Active reports, grouped by approved area."
            >
              {dataUnavailable ? (
                <p className="text-ink-400 text-[0.78rem] leading-relaxed">
                  Available when the campaign database reconnects.
                </p>
              ) : localities.length === 0 ? (
                <p className="text-ink-400 text-[0.78rem] leading-relaxed">
                  Your first report will begin this list. Only approved localities can be reported.
                </p>
              ) : (
                <ul className="space-y-3.5">
                  {localities.slice(0, 5).map((locality) => {
                    const coverage = coverageById.get(locality.id);
                    return (
                      <li key={locality.id}>
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-bark-900 min-w-0 truncate text-[0.8rem] font-semibold">
                            {locality.name}
                          </p>
                          <p className="text-bark-900 shrink-0 text-[0.8rem] font-semibold tabular-nums">
                            {formatNumber(locality.total)}
                          </p>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="bg-line/80 h-1.5 flex-1 overflow-hidden rounded-full">
                            <span
                              className="bg-saffron-600 block h-full rounded-full"
                              style={{
                                width: `${Math.max(
                                  8,
                                  (locality.total / localities[0].total) * 100,
                                )}%`,
                              }}
                            />
                          </span>
                          <span className="text-ink-400 w-24 shrink-0 text-right text-[0.62rem]">
                            {coverage?.coveragePercentage === null ||
                            coverage?.coveragePercentage === undefined
                              ? "Coverage unavailable"
                              : `${coverage.coveragePercentage.toFixed(1)}% coverage`}
                          </span>
                        </div>
                        <p className="text-ink-400 mt-1 text-[0.64rem]">
                          {locality.reportCount}{" "}
                          {locality.reportCount === 1 ? "report" : "reports"} ·{" "}
                          {locality.type || "Locality"}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
              {localities.length > 5 ? (
                <p className="text-ink-400 mt-4 text-[0.68rem]">
                  +{localities.length - 5} more in your full history above.
                </p>
              ) : null}
            </SidebarCard>

            <SidebarCard
              title="Outreach rhythm"
              description="Active invitations over the last six months."
            >
              {dataUnavailable ? (
                <p className="text-ink-400 text-[0.78rem] leading-relaxed">Unavailable right now.</p>
              ) : (
                <>
                  <div className="flex h-28 items-end gap-2" aria-hidden="true">
                    {months.map((month) => (
                      <div key={month.key} className="flex flex-1 flex-col items-center gap-2">
                        <span className="text-ink-400 text-[0.58rem] font-semibold tabular-nums">
                          {month.total > 0 ? month.total : ""}
                        </span>
                        <div className="flex w-full flex-1 items-end">
                          <div
                            className={cn(
                              "w-full rounded-t-md",
                              month.total > 0 ? "bg-saffron-600" : "bg-line/70",
                            )}
                            style={{
                              height: `${Math.max(3, (month.total / monthMax) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-ink-400 text-[0.6rem] font-semibold">{month.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-ink-400 mt-3 text-[0.68rem] leading-relaxed">
                    {months.every((month) => month.total === 0)
                      ? "No active invitations recorded in this window yet."
                      : "A quiet record of your own effort — never a comparison with anyone else."}
                  </p>
                </>
              )}
            </SidebarCard>

            <div className="border-line rounded-2xl border bg-white/60 p-5">
              <p className="text-ink-500 text-[0.74rem] leading-relaxed">
                Need to correct something? Contact the Mahotsav committee through the{" "}
                <a
                  href="https://www.satsang.org.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-saffron-700 font-semibold underline underline-offset-2"
                >
                  official Satsang website
                </a>
                . Never share your password with anyone.
              </p>
            </div>
          </aside>
        </div>
      </div>

      <SubmitReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        areas={areas}
        onSubmitted={refreshData}
      />
      <ProposeAreaModal
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
        areas={areas}
        onSubmitted={refreshData}
      />
    </div>
  );
}
