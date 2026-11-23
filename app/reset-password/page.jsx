import PageHero from "@/ui/components/ui/PageHero";
import ResetPasswordClient from "@/ui/components/account/ResetPasswordClient";

export const metadata = {
  title: "Reset password",
  description: "Set a new password for your Utsav-Connect account using your reset link.",
};

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }) {
  const params = await searchParams;
  const token = typeof params?.token === "string" ? params.token : "";

  return (
    <>
      <PageHero
        eyebrow="Password reset"
        title="Set a new password."
        description="Choose a strong password to regain access to your devotee dashboard."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Sign in", href: "/apply?mode=login" },
          { label: "Reset password" },
        ]}
      />
      <section className="pattern-contour relative overflow-hidden bg-cream py-16 sm:py-20">
        <div className="shell relative">
          <ResetPasswordClient token={token} />
          <p className="mx-auto mt-6 max-w-xl text-center text-[0.72rem] leading-relaxed text-ink-400">
            Utsav-Connect will never ask for your password in an email. If a message claims
            otherwise, do not respond to it.
          </p>
        </div>
      </section>
    </>
  );
}
