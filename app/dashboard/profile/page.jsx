import { requireActiveDevoteePage } from "@/app/_lib/devotee-page";
import PageHero from "@/ui/components/ui/PageHero";
import Notice from "@/ui/components/ui/Notice";
import { formatDate } from "@/ui/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My profile — Devotee portal",
  description: "Your own account information, read-only.",
};

export default async function ProfilePage() {
  const user = await requireActiveDevoteePage();

  const rows = [
    { label: "Full name", value: user.fullName },
    { label: "Email address", value: user.email },
    { label: "Phone number", value: user.phone ?? "Not recorded" },
    { label: "Gender", value: user.gender ?? "Not recorded" },
    { label: "Account status", value: user.status },
    { label: "Email verification", value: user.emailVerified ? "Verified" : "Not verified" },
    { label: "Member since", value: user.createdAt ? formatDate(user.createdAt) : "Not recorded" },
    {
      label: "Last sign in",
      value: user.lastLoginAt ? formatDate(user.lastLoginAt) : "Not recorded",
    },
  ];

  return (
    <>
      <PageHero
        eyebrow="Devotee portal"
        title="Your account."
        description="This is your own account information as stored by the platform. It is shown read-only because there is no approved profile-editing workflow yet."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Devotee portal", href: "/dashboard" },
          { label: "My profile" },
        ]}
      />
      <div className="shell max-w-3xl space-y-6 py-8 sm:py-10">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
          <dl className="divide-y divide-line">
            {rows.map((row) => (
              <div key={row.label} className="grid gap-1 py-3.5 sm:grid-cols-[12rem_1fr] sm:gap-4">
                <dt className="text-[0.72rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                  {row.label}
                </dt>
                <dd className="text-sm text-bark-900">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <Notice tone="info" title="Read-only profile">
          Passwords, session tokens and internal review notes are never shown here. To sign out, use
          the account menu in the header.
        </Notice>
      </div>
    </>
  );
}
