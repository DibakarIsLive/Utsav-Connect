import { getEnv } from "@/api/lib/env/env";
import ApplyClient from "@/ui/components/account/ApplyClient";

export const metadata = {
  title: "Apply or sign in",
  description:
    "Apply to join the Mahotsav outreach community, or sign in to your devotee account, application status, or admin workspace.",
};

export const dynamic = "force-dynamic";

export default async function ApplyPage({ searchParams }) {
  const params = await searchParams;
  const mode = params?.mode === "login" ? "login" : "apply";

  let registrationOpen = true;
  try {
    registrationOpen = getEnv().REGISTRATION_MODE !== "closed";
  } catch {
    registrationOpen = false;
  }

  return <ApplyClient initialMode={mode} registrationOpen={registrationOpen} />;
}
