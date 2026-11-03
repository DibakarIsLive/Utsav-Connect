import Container from "@/ui/components/ui/Container";
import PageHeader from "@/ui/components/ui/PageHeader";

export const metadata = {
  title: "About",
  description: "What Utsav-Connect is, who uses it, and the principles that govern its data.",
};

const ROLES = [
  {
    name: "Visitor",
    can: "Explore approved areas and public campaign statistics.",
    cannot: "Submit invitation reports or see devotee-only proposal history.",
  },
  {
    name: "Registered devotee",
    can: "Submit invitation reports, propose localities, and manage their own eligible proposals.",
    cannot: "Create official areas or edit another person's submission.",
  },
  {
    name: "Administrator",
    can: "Create and approve official areas, review proposals, and manage population data and reports.",
    cannot: "Bypass the audit trail — approvals, rejections, and corrections are recorded.",
  },
];

const PRINCIPLES = [
  [
    "Proposed areas are not approved areas.",
    "Pending proposals never change the official map or its statistics.",
  ],
  [
    "Permission checks happen on the server.",
    "Hiding a button is not security; every request is authorised independently.",
  ],
  [
    "History is preserved.",
    "Approvals, rejections, corrections, and withdrawals are traceable, never silently erased.",
  ],
  [
    "Every statistic has a definition.",
    "Estimated population, reported invitations, and active devotees are different numbers and are labelled as such.",
  ],
  [
    "Geography is flexible.",
    "Localities belong to towns, towns to regions — the hierarchy is configurable, not hardcoded.",
  ],
];

export default function AboutPage() {
  return (
    <Container>
      <PageHeader
        eyebrow="About"
        title="A shared map for a shared effort"
        description="Utsav-Connect records where a Mahotsav outreach campaign has reached. The venue is one point of interest; the campaign can span as many localities as it needs."
      />

      <section aria-labelledby="roles-heading">
        <h2 id="roles-heading" className="text-2xl font-bold tracking-tight text-slate-900">
          Who uses it
        </h2>
        <dl className="mt-6 grid gap-6 md:grid-cols-3">
          {ROLES.map((role) => (
            <div
              key={role.name}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <dt className="text-lg font-semibold text-slate-900">{role.name}</dt>
              <dd className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
                <p>
                  <span className="font-semibold text-emerald-700">Can:</span> {role.can}
                </p>
                <p>
                  <span className="font-semibold text-red-700">Cannot:</span> {role.cannot}
                </p>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="principles-heading" className="mt-16">
        <h2 id="principles-heading" className="text-2xl font-bold tracking-tight text-slate-900">
          The rules the data follows
        </h2>
        <ol className="mt-6 space-y-4">
          {PRINCIPLES.map(([title, body], index) => (
            <li
              key={title}
              className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800"
              >
                {index + 1}
              </span>
              <div>
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </Container>
  );
}
