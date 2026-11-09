import PageHero from "@/ui/components/ui/PageHero";
import VerifyEmailClient from "@/ui/components/account/VerifyEmailClient";

export const metadata = {
  title: "Verify email",
  description: "Confirm the email address attached to your Utsav-Connect application.",
};

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }) {
  const params = await searchParams;
  const token = typeof params?.token === "string" ? params.token : "";

  return (
    <>
      <PageHero
        eyebrow="Account verification"
        title="One small step to confirm your place."
        description="Email verification keeps applications genuine and protects the person behind every report."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Verify email" }]}
      />
      <section className="bg-cream pattern-contour relative overflow-hidden py-16 sm:py-20">
        <div className="shell relative">
          <VerifyEmailClient token={token} />
          <p className="text-ink-400 mx-auto mt-6 max-w-xl text-center text-[0.72rem] leading-relaxed">
            Utsav-Connect will never ask for your password in an email. If a message claims
            otherwise, do not respond to it.
          </p>
        </div>
      </section>
    </>
  );
}
