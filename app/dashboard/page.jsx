import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseSessionToken } from "@/api/lib/auth/session";
import { validateSession } from "@/api/services/auth-service";
import { listReports } from "@/api/services/invitation-service";
import { getCoverageAnalytics } from "@/api/services/invitation-service";
import { listApprovedAreas } from "@/api/services/area-service";
import { listProposals } from "@/api/services/proposal-service";
import DashboardClient from "@/ui/components/dashboard/DashboardClient";

export const metadata = {
  title: "Devotee dashboard",
  description:
    "Record invitations, follow your proposals, and keep your Mahotsav outreach history in one private workspace.",
};

export const dynamic = "force-dynamic";

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = parseSessionToken(cookieStore.toString());
  const user = token ? await validateSession(token) : null;

  if (!user) {
    redirect("/apply?mode=login");
  }
  if (user.role === "admin" || user.role === "super_admin") {
    redirect("/admin");
  }
  if (user.status !== "active") {
    redirect("/application-status");
  }

  let reports = [];
  let areas = [];
  let proposals = [];
  let analytics = [];
  let initialError = null;

  try {
    const [reportRecords, areaRecords, proposalRecords, coverage] = await Promise.all([
      listReports(user),
      listApprovedAreas(),
      listProposals(user),
      getCoverageAnalytics(),
    ]);
    reports = plain(reportRecords);
    areas = plain(areaRecords);
    proposals = plain(proposalRecords);
    analytics = plain(coverage);
  } catch {
    initialError =
      "Your workspace data could not be loaded from the campaign database. Nothing is being shown in its place rather than displaying stale or invented figures.";
  }

  return (
    <DashboardClient
      initialUser={user}
      initialReports={reports}
      initialAreas={areas}
      initialProposals={proposals}
      initialAnalytics={analytics}
      initialError={initialError}
    />
  );
}
