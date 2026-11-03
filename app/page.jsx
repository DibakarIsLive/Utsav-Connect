import Link from "next/link";
import Container from "@/ui/components/ui/Container";
import StatusNotice from "@/ui/components/ui/StatusNotice";

const GOALS = [
  {
    title: "Explore approved areas",
    body: "Visitors browse official localities and public campaign statistics on an interactive map.",
  },
  {
    title: "Report invitations",
    body: "Registered devotees record how many people they invited in each approved locality.",
  },
  {
    title: "See coverage honestly",
    body: "Reported invitations are compared with population estimates per area, with clear definitions and no silently capped numbers.",
  },
  {
    title: "Grow the map together",
    body: "Devotees propose new localities and boundaries; administrators review and approve them before they become official.",
  },
];

const ROADMAP_STATUS = [
  {
    stage: "Stage 1 — Foundation",
    state: "In progress",
    detail: "Project setup, database connection, layouts, tests, docs.",
  },
  {
    stage: "Stage 2 — Accounts",
    state: "Not started",
    detail: "Registration, login, roles, protected routes.",
  },
  {
    stage: "Stage 3 — Geography",
    state: "Not started",
    detail: "Area hierarchy, Google Maps, boundaries, proposals.",
  },
  {
    stage: "Stage 4 — Invitations",
    state: "Not started",
    detail: "Population records, reports, coverage calculations.",
  },
];

export default function HomePage() {
  return (
    <Container>
      <section className="max-w-3xl">
        <p className="mb-3 text-sm font-semibold tracking-wide text-brand-700 uppercase">
          Mahotsav outreach platform
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Every invitation, every locality, one shared map.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-slate-600">
          Utsav-Connect helps a Mahotsav outreach campaign understand where invitations have reached
          and where they have not — across any number of localities, towns, and regions.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/map"
            className="rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Open the map
          </Link>
          <Link
            href="/about"
            className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            How it works
          </Link>
        </div>
      </section>

      <section aria-labelledby="goals-heading" className="mt-16">
        <h2 id="goals-heading" className="text-2xl font-bold tracking-tight text-slate-900">
          What the platform is built to do
        </h2>
        <ul className="mt-6 grid gap-6 sm:grid-cols-2">
          {GOALS.map((goal) => (
            <li
              key={goal.title}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-slate-900">{goal.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{goal.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="status-heading" className="mt-16">
        <h2 id="status-heading" className="text-2xl font-bold tracking-tight text-slate-900">
          Where the project stands
        </h2>
        <div className="mt-4">
          <StatusNotice variant="info" title="This site is under active development.">
            Only the public shell exists today. Accounts, the interactive map, and invitation
            reporting arrive in later stages of the roadmap.
          </StatusNotice>
        </div>
        <table className="mt-6 w-full border-collapse overflow-hidden rounded-xl border border-slate-200 bg-white text-left text-sm shadow-sm">
          <thead className="bg-slate-100 text-xs tracking-wide text-slate-600 uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Stage
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                State
              </th>
              <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">
                Scope
              </th>
            </tr>
          </thead>
          <tbody>
            {ROADMAP_STATUS.map((row) => (
              <tr key={row.stage} className="border-t border-slate-200">
                <th scope="row" className="px-4 py-3 font-medium text-slate-900">
                  {row.stage}
                </th>
                <td className="px-4 py-3 text-slate-700">{row.state}</td>
                <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{row.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Container>
  );
}
