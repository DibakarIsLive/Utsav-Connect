import PageHero from "@/ui/components/ui/PageHero";
import ApplicationStatusClient from "@/ui/components/account/ApplicationStatusClient";

export const metadata = {
  title: "Application status",
  description: "Follow your devotee application and account verification progress.",
};

export default function ApplicationStatusPage() {
  return (
    <>
      <PageHero
        eyebrow="Applicant portal"
        title="Follow your application, without guessing."
        description="Verification, review and approval are recorded as they happen. This page shows your own application only — never internal notes or another applicant's details."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Application status" }]}
      />
      <ApplicationStatusClient />
    </>
  );
}
