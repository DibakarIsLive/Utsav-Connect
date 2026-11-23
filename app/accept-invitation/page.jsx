import PageHero from "@/ui/components/ui/PageHero";
import AcceptInvitationClient from "@/ui/components/account/AcceptInvitationClient";

export const metadata = {
  title: "Accept administrator invitation",
  description: "Accept your administrator invitation and set up your Utsav-Connect account.",
};

export const dynamic = "force-dynamic";

export default async function AcceptInvitationPage({ searchParams }) {
  const params = await searchParams;
  const token = typeof params?.token === "string" ? params.token : "";

  return (
    <>
      <PageHero
        eyebrow="Administrator invitation"
        title="Accept your invitation."
        description="Set up your administrator account with the permissions assigned by the Super Admin."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Sign in", href: "/apply?mode=login" },
          { label: "Accept invitation" },
        ]}
      />
      <section className="pattern-contour relative overflow-hidden bg-cream py-16 sm:py-20">
        <div className="shell relative">
          <AcceptInvitationClient token={token} />
          <p className="mx-auto mt-6 max-w-xl text-center text-[0.72rem] leading-relaxed text-ink-400">
            Utsav-Connect will never ask for your password in an email. If a message claims
            otherwise, do not respond to it.
          </p>
        </div>
      </section>
    </>
  );
}
