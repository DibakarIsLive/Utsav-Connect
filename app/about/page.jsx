import Image from "next/image";
import Link from "next/link";
import PageHero from "@/ui/components/ui/PageHero";
import Reveal from "@/ui/components/ui/Reveal";
import SectionHeading from "@/ui/components/ui/SectionHeading";
import { ButtonLink, ArrowRight } from "@/ui/components/ui/Button";
import { LotusDivider } from "@/ui/components/ui/Ornament";
import { IMAGE_CREDITS } from "@/ui/lib/image-credits";

export const metadata = {
  title: "About",
  description:
    "What Utsav-Connect is, how the shared campaign map works, how invitation reporting and coverage are calculated, and the heritage photographs used on this site.",
};

const MAP_STEPS = [
  {
    number: "01",
    title: "A locality is proposed",
    body: "A devotee who knows a place can propose it with a name, an optional boundary, and what is known about its population. Proposals are clearly marked as proposals.",
  },
  {
    number: "02",
    title: "An administrator reviews",
    body: "Administrators check duplicate warnings, the hierarchy and the available evidence. A proposal can be approved, returned for correction, marked duplicate, or rejected.",
  },
  {
    number: "03",
    title: "Approval publishes the area",
    body: "Only an approved area becomes part of the official campaign map. Its boundary, parent area and population estimate become visible to every visitor.",
  },
  {
    number: "04",
    title: "Reports build the picture",
    body: "Invitation reports recorded in that area — and in its approved children — roll up into coverage. Every report is counted exactly once.",
  },
];

const COVERAGE_RULES = [
  {
    title: "Missing population means unavailable",
    body: "If an area has no recorded population estimate, coverage is shown as unavailable. It is never displayed as 0%, because zero would imply something we do not know.",
  },
  {
    title: "Above 100% stays visible",
    body: "Reported invitations can legitimately exceed an old or partial population estimate. The real figure is displayed and flagged, never silently capped or hidden.",
  },
  {
    title: "Parents count descendants once",
    body: "A parent area includes reports from its approved descendants, but each report belongs to exactly one area. No report is added twice and pending proposals never contribute.",
  },
];

const ROLES = [
  {
    name: "Visitors",
    body: "Explore approved localities, public coverage figures and venue directions. No account is needed.",
  },
  {
    name: "Applicants",
    body: "Apply to join and follow the status of their own application. They cannot see other applicants or internal review notes.",
  },
  {
    name: "Active devotees",
    body: "Record invitations in approved areas, view their own reporting history, and propose new localities for review.",
  },
  {
    name: "Administrators",
    body: "Review applications and proposals, publish official areas, manage population data, and audit invitation reports within their assigned permissions.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Utsav-Connect"
        title="A shared map, held together by trust."
        description="Utsav-Connect is a coordination platform for the Mahotsav outreach community. It exists to make the work of invitation, locality by locality, visible, honest and easier to carry together."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
      />

      <section className="bg-ivory py-20 sm:py-24">
        <div className="shell grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow text-saffron-700 eyebrow-line">Why this platform exists</p>
            <h2 className="text-bark-900 mt-5 max-w-2xl text-[2.1rem] leading-[1.06] font-semibold tracking-[-0.04em] sm:text-[2.8rem]">
              Outreach is personal. Coordination should still be shared.
            </h2>
            <div className="prose-editorial mt-6 max-w-2xl">
              <p>
                The Mahotsav outreach is built in conversations — a family invited, a street
                visited, a locality reached. Much of that work happens quietly, across many hands
                and many places. Utsav-Connect gives it a common map without taking away its
                personal character.
              </p>
              <p>
                The platform brings three things together: a geographic record of{" "}
                <strong>approved localities</strong>, a private-by-design way for devotees to{" "}
                <strong>record invitations</strong>, and a public view of{" "}
                <strong>coverage</strong> that distinguishes what is known from what is not.
              </p>
              <p>
                It is deliberately not a leaderboard. There are no rankings of devotees, no public
                contributor identities and no invented numbers. The purpose is coordination,
                accountability and care — not competition.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <aside className="card-paper sticky top-28 p-7">
              <p className="eyebrow text-saffron-700">At a glance</p>
              <dl className="divide-line mt-5 divide-y">
                {[
                  ["Purpose", "Coordinate Mahotsav outreach across localities"],
                  ["Map", "Approved campaign areas only"],
                  ["Reporting", "Aggregate invitation counts; no invitee details"],
                  ["Access", "Public exploration; accounts required to report"],
                ].map(([term, description]) => (
                  <div key={term} className="py-4 first:pt-0 last:pb-0">
                    <dt className="text-ink-400 text-[0.62rem] font-bold tracking-[0.14em] uppercase">
                      {term}
                    </dt>
                    <dd className="text-bark-900 mt-1.5 text-sm leading-relaxed">{description}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 rounded-2xl bg-cream p-4">
                <p className="text-ink-500 text-[0.72rem] leading-relaxed">
                  Utsav-Connect is an outreach coordination platform. It is not an official
                  publication of Satsang. Official resources are linked for reference.
                </p>
              </div>
            </aside>
          </Reveal>
        </div>
      </section>

      <section className="bg-cream py-20 sm:py-24">
        <div className="shell">
          <Reveal>
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16">
              <div className="relative overflow-hidden rounded-[1.75rem] border-4 border-white shadow-[var(--shadow-arch)]">
                <div className="relative aspect-[5/4]">
                  <Image
                    src="/images/ashram/deoghar-avenue.webp"
                    alt="The approach to Satsang Ashram, Deoghar, lined with trees"
                    fill
                    sizes="(min-width: 1024px) 42vw, 90vw"
                    className="object-cover"
                  />
                  <div className="from-bark-950/75 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
                  <p className="absolute bottom-5 left-5 text-[0.62rem] font-bold tracking-[0.16em] text-gold-300 uppercase">
                    Satsang Ashram · Deoghar
                  </p>
                </div>
              </div>

              <div>
                <p className="eyebrow text-saffron-700 eyebrow-line">The Mahotsav connection</p>
                <h2 className="text-bark-900 mt-5 text-[2rem] leading-[1.08] font-semibold tracking-[-0.04em] sm:text-[2.6rem]">
                  One celebration. Many places preparing to welcome it.
                </h2>
                <div className="prose-editorial mt-5">
                  <p>
                    The Mahotsav is a central celebration in the life of Satsang, and Satsang
                    Ashram in Deoghar is its home. Around that centre, devotees reach out across
                    towns, neighbourhoods and villages to extend invitations and prepare a warm
                    welcome.
                  </p>
                  <p>
                    Utsav-Connect supports that preparation. It does not replace the personal
                    invitation, the local relationship or the discernment of the people doing the
                    work. It simply helps everyone see the whole field more clearly.
                  </p>
                </div>
                <div className="mt-7 flex flex-wrap gap-3">
                  <ButtonLink
                    href="https://www.satsang.org.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="dark"
                  >
                    Visit the official Satsang site
                  </ButtonLink>
                  <ButtonLink
                    href="https://maps.app.goo.gl/BcY87xSjA6iRtBY78"
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="secondary"
                  >
                    Official venue
                  </ButtonLink>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-ivory py-20 sm:py-24">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="The campaign map"
              title="How a locality becomes official."
              description="A proposal is not an approved area. This distinction protects the integrity of every public total on the map."
              align="center"
            />
          </Reveal>

          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {MAP_STEPS.map((step, index) => (
              <Reveal key={step.number} delay={index * 0.07}>
                <div className="card-warm relative h-full p-6">
                  <span className="font-display text-saffron-600/90 text-4xl font-semibold">
                    {step.number}
                  </span>
                  <h3 className="text-bark-900 mt-4 text-lg font-semibold tracking-[-0.02em]">
                    {step.title}
                  </h3>
                  <p className="text-ink-500 mt-2.5 text-sm leading-[1.7]">{step.body}</p>
                  {index < MAP_STEPS.length - 1 ? (
                    <span className="text-gold-500/70 absolute top-1/2 -right-3 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-ivory lg:flex">
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  ) : null}
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2}>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              <div className="border-line rounded-3xl border bg-white p-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                      <path d="m4.5 10.5 3.4 3.4 7.6-8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <h3 className="text-bark-900 text-lg font-semibold">Approved area</h3>
                </div>
                <ul className="text-ink-600 mt-4 space-y-2.5 text-sm leading-relaxed">
                  <li>Appears on the public map and in lists.</li>
                  <li>Can receive invitation reports from active devotees.</li>
                  <li>Contributes to public coverage when a population estimate exists.</li>
                </ul>
              </div>
              <div className="border-line rounded-3xl border border-dashed bg-cream/60 p-7">
                <div className="flex items-center gap-3">
                  <span className="text-ink-500 flex h-8 w-8 items-center justify-center rounded-full bg-white">
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M10 6.5V10l2.4 1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                  <h3 className="text-bark-900 text-lg font-semibold">Pending proposal</h3>
                </div>
                <ul className="text-ink-500 mt-4 space-y-2.5 text-sm leading-relaxed">
                  <li>Never appears as an official locality.</li>
                  <li>Never contributes to public invitation totals or coverage.</li>
                  <li>Is visible only to its proposer and authorised reviewers.</li>
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-bark-950 text-ivory relative overflow-hidden py-20 sm:py-24">
        <div className="pattern-jaali absolute inset-0 opacity-[0.12]" aria-hidden="true" />
        <div className="shell relative">
          <Reveal>
            <SectionHeading
              tone="light"
              eyebrow="Coverage, explained"
              title="A percentage should never pretend to know more than it does."
              description="Coverage is a simple ratio. The care is in how missing data, descendant areas and values above 100% are handled."
              align="center"
            />
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mx-auto mt-12 max-w-3xl rounded-[1.75rem] border border-white/12 bg-white/[0.05] p-6 sm:p-8">
              <p className="text-[0.64rem] font-bold tracking-[0.16em] text-gold-300 uppercase">
                The formula
              </p>
              <div className="mt-4 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center sm:gap-5">
                <div className="rounded-xl border border-white/12 bg-white/[0.06] px-5 py-3">
                  <p className="text-sm font-semibold text-ivory">Reported invitations</p>
                  <p className="text-ivory/45 mt-1 text-[0.66rem]">In the area and its approved children, counted once</p>
                </div>
                <span className="text-gold-300 text-2xl font-light" aria-hidden="true">
                  ÷
                </span>
                <div className="rounded-xl border border-white/12 bg-white/[0.06] px-5 py-3">
                  <p className="text-sm font-semibold text-ivory">Recorded population</p>
                  <p className="text-ivory/45 mt-1 text-[0.66rem]">The population estimate held for that area</p>
                </div>
                <span className="text-gold-300 text-2xl font-light" aria-hidden="true">
                  =
                </span>
                <div className="rounded-xl border border-gold-400/30 bg-gold-400/10 px-5 py-3">
                  <p className="text-gold-200 text-sm font-semibold">Coverage</p>
                  <p className="text-ivory/45 mt-1 text-[0.66rem]">Shown as a percentage</p>
                </div>
              </div>
              <p className="text-ivory/35 mt-5 text-center text-[0.68rem]">
                Diagram only. Live figures appear on the campaign map.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {COVERAGE_RULES.map((rule, index) => (
              <Reveal key={rule.title} delay={index * 0.08}>
                <div className="h-full rounded-2xl border border-white/10 bg-white/[0.035] p-6">
                  <span className="text-gold-300 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-sm font-bold">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-ivory">
                    {rule.title}
                  </h3>
                  <p className="text-ivory/55 mt-2.5 text-sm leading-[1.75]">{rule.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ivory py-20 sm:py-24">
        <div className="shell grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow text-saffron-700 eyebrow-line">Privacy and accountability</p>
            <h2 className="text-bark-900 mt-5 text-[2.1rem] leading-[1.06] font-semibold tracking-[-0.04em] sm:text-[2.7rem]">
              The people we invite are never the data.
            </h2>
            <div className="prose-editorial mt-5">
              <p>
                Invitation reporting records a number and a locality — not a list of people. No
                invitee names, phone numbers or personal details are collected. A devotee sees
                their own reports; authorised administrators see the campaign as a whole.
              </p>
              <p>
                Every approval, rejection, correction and invalidation is written to an audit log.
                Internal reviewer notes are never shown to applicants. Public analytics contain
                aggregate figures only; contributor identities and private descriptions stay out of
                the public view.
              </p>
            </div>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {[
                ["No invitee data", "Counts only, never personal details."],
                ["Private by default", "Your reports belong to you and authorised reviewers."],
                ["Audited decisions", "Sensitive actions leave a permanent record."],
                ["Honest public data", "Aggregates only, with missing values labelled."],
              ].map(([title, body]) => (
                <div key={title} className="border-line rounded-2xl border bg-white p-5">
                  <p className="text-bark-900 text-sm font-semibold">{title}</p>
                  <p className="text-ink-500 mt-1.5 text-[0.78rem] leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="card-warm p-7 sm:p-8">
              <p className="eyebrow text-saffron-700">Who uses Utsav-Connect</p>
              <div className="divide-line mt-4 divide-y">
                {ROLES.map((role) => (
                  <div key={role.name} className="py-5 first:pt-3 last:pb-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-bark-900 text-base font-semibold">{role.name}</h3>
                      <span className="bg-gold-500 h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden="true" />
                    </div>
                    <p className="text-ink-500 mt-1.5 text-sm leading-relaxed">{role.body}</p>
                  </div>
                ))}
              </div>
              <ButtonLink href="/apply" className="mt-7 w-full">
                Apply to join
                <ArrowRight />
              </ButtonLink>
              <p className="text-ink-400 mt-3 text-center text-[0.68rem]">
                Already have an account? Sign in from the same page.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="heritage" className="bg-cream pattern-contour relative overflow-hidden py-20 sm:py-24">
        <div className="shell relative">
          <Reveal>
            <SectionHeading
              eyebrow="Heritage"
              title="A tradition carried through lives, not just records."
              description="Satsang draws its inspiration from the life and teachings of Shree Shree Thakur Anukulchandra. These historical photographs are reproduced with documented provenance and respect."
            />
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              {
                src: "/images/heritage/thakur-under-babla-tree.webp",
                alt: "Historical photograph of Shree Shree Thakur Anukulchandra seated under a babla tree in Pabna",
                title: "Under the babla tree",
                width: 449,
                height: 640,
              },
              {
                src: "/images/heritage/thakur-as-a-boy.webp",
                alt: "Historical boyhood portrait of Shree Shree Thakur Anukulchandra",
                title: "The early years",
                width: 900,
                height: 1121,
              },
              {
                src: "/images/heritage/thakur-portrait.webp",
                alt: "Portrait of Shree Shree Thakur Anukulchandra",
                title: "A living inspiration",
                width: 459,
                height: 600,
              },
            ].map((image, index) => (
              <Reveal key={image.src} delay={index * 0.08}>
                <figure className="group overflow-hidden rounded-2xl border-4 border-white bg-white shadow-[var(--shadow-soft)]">
                  <div className="relative aspect-[4/5] overflow-hidden bg-cream">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      width={image.width}
                      height={image.height}
                      sizes="(min-width: 640px) 30vw, 90vw"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                  </div>
                  <figcaption className="px-4 py-3">
                    <p className="font-display text-bark-900 text-base font-semibold">{image.title}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.15}>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              <figure className="overflow-hidden rounded-2xl border-4 border-white bg-white shadow-[var(--shadow-soft)]">
                <div className="relative aspect-[16/9]">
                  <Image
                    src="/images/ashram/chakratirtha-satsang-vihar.webp"
                    alt="Chakratirtha Satsang Vihar, a Satsang centre"
                    fill
                    sizes="(min-width: 768px) 45vw, 90vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="text-ink-500 px-4 py-3 text-[0.75rem]">
                  Chakratirtha Satsang Vihar. Photograph by Shobhanlal mukherjee150, CC BY-SA 4.0.
                </figcaption>
              </figure>
              <figure className="overflow-hidden rounded-2xl border-4 border-white bg-white shadow-[var(--shadow-soft)]">
                <div className="relative aspect-[16/9]">
                  <Image
                    src="/images/satsang/falakata-diwali.webp"
                    alt="Satsang Vihar, Falakata, illuminated during Diwali"
                    fill
                    sizes="(min-width: 768px) 45vw, 90vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="text-ink-500 px-4 py-3 text-[0.75rem]">
                  Satsang Vihar, Falakata, during Diwali. Photograph by Royz007, CC BY-SA 4.0.
                </figcaption>
              </figure>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-line bg-white/70 p-6">
              <p className="text-ink-500 text-[0.82rem] leading-[1.8]">
                <strong className="text-bark-900 font-semibold">A note on authenticity.</strong>{" "}
                No historical person or event on this page has been generated or altered with AI.
                Photographs are reproduced from Wikimedia Commons under the licences recorded
                below. Where the original uploader is anonymous, that is stated. Images of Satsang
                centres are included to show the wider tradition, not to suggest that the
                Utsav-Connect campaign itself has formally adopted those locations as venues.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="credits" className="bg-ivory py-20 sm:py-24">
        <div className="shell">
          <Reveal>
            <SectionHeading
              eyebrow="Image credits"
              title="Every photograph, with its source."
              description="These images are published under the licences shown. Follow a source link to the original Wikimedia Commons page."
            />
          </Reveal>

          <div className="mt-10 overflow-hidden rounded-3xl border border-line bg-white">
            <ul className="divide-y divide-line">
              {IMAGE_CREDITS.map((credit) => (
                <li key={credit.asset} className="grid gap-4 p-5 sm:grid-cols-[4rem_1fr_auto] sm:items-center">
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-cream">
                    <Image
                      src={credit.asset}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-bark-900 text-sm font-semibold">{credit.title}</p>
                    <p className="text-ink-500 mt-1 text-[0.76rem] leading-relaxed">
                      {credit.author} · {credit.note}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <a
                      href={credit.licenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border-line text-ink-600 hover:border-gold-400 inline-flex items-center rounded-full border px-3 py-1 text-[0.66rem] font-bold tracking-[0.04em] uppercase transition-colors"
                    >
                      {credit.licence}
                    </a>
                    <a
                      href={credit.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-saffron-700 hover:text-saffron-800 inline-flex items-center gap-1 text-[0.72rem] font-semibold"
                    >
                      Source <ArrowRight className="h-3 w-3" />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-ink-400 mt-5 text-[0.72rem] leading-relaxed">
            Image files were resized and converted to WebP for delivery. Historical photographs
            were not otherwise altered. Some images still require formal confirmation from the
            original copyright holder if the campaign later decides to use them in printed
            material; the licences above cover this website&apos;s use.
          </p>
        </div>
      </section>

      <section className="bg-cream py-20 sm:py-24">
        <div className="shell">
          <Reveal>
            <div className="text-center">
              <LotusDivider className="mb-7" />
              <h2 className="text-bark-900 mx-auto max-w-2xl text-[2.1rem] leading-[1.08] font-semibold tracking-[-0.04em] text-balance sm:text-[2.8rem]">
                If you know a locality that is not yet on the map, help us find it.
              </h2>
              <p className="text-ink-600 mx-auto mt-5 max-w-xl text-[1rem] leading-[1.8]">
                Apply to join, then propose the places you know. Every approved locality makes the
                shared picture more complete.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <ButtonLink href="/apply" size="lg">
                  Apply to join
                  <ArrowRight />
                </ButtonLink>
                <ButtonLink href="/apply" size="lg">
                  Apply to join
                  <ArrowRight />
                </ButtonLink>
              </div>
              <p className="text-ink-400 mt-5 text-[0.72rem]">
                Questions about the campaign?{" "}
                <Link href="https://www.satsang.org.in/" className="text-saffron-700 font-semibold underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                  Refer to the official Satsang website
                </Link>
                .
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
