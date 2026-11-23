import { requireActiveDevoteePage } from "@/app/_lib/devotee-page";
import { listApprovedAreas } from "@/api/services/area-service";
import PageHero from "@/ui/components/ui/PageHero";
import Notice from "@/ui/components/ui/Notice";
import NewReportView from "@/ui/components/dashboard/NewReportView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Submit invitations — Devotee portal",
  description: "Record invitations extended in an approved locality.",
};

export default async function NewInvitationPage() {
  await requireActiveDevoteePage();

  let areas = [];
  let unavailable = false;
  try {
    areas = JSON.parse(JSON.stringify(await listApprovedAreas()));
  } catch {
    unavailable = true;
  }

  return (
    <>
      <PageHero
        eyebrow="Devotee portal"
        title="Record your invitations."
        description="Choose an approved locality, enter the number of invitations you personally extended, and add a date. Only the count is stored."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Devotee portal", href: "/dashboard" },
          { label: "Submit invitations" },
        ]}
      />
      {unavailable ? (
        <div className="shell py-8">
          <Notice tone="error" title="Approved areas unavailable">
            The form cannot be shown because approved areas could not be loaded. Please try again.
          </Notice>
        </div>
      ) : (
        <NewReportView areas={areas} />
      )}
    </>
  );
}
