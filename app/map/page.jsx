import Link from "next/link";
import Reveal from "@/ui/components/ui/Reveal";
import { ButtonLink, ArrowRight } from "@/ui/components/ui/Button";
import VenueVisual from "@/ui/components/venue/VenueVisual";
import { cn } from "@/ui/lib/cn";
import { OFFICIAL_VENUE } from "@/ui/lib/venue";

const VENUES = [
  {
    name: OFFICIAL_VENUE.name,
    location: OFFICIAL_VENUE.locality,
    description: "The official Mahotsav venue where the central celebration gathers.",
    mapUrl: OFFICIAL_VENUE.shortUrl,
    directionsUrl: OFFICIAL_VENUE.directionsUrl,
    credit:
      "No photograph of this venue is held by the project. The panel above is an illustration; the destination link is owner-supplied and not independently resolved.",
  },
];

export const metadata = {
  title: "Mahotsav venue — Utsav-Connect",
  description:
    "Find the official Mahotsav venue at Kulti Golf Ground. Get directions or open the location in Google Maps.",
};

export const dynamic = "force-dynamic";

export default function MapPage() {
  return (
    <div className="relative overflow-hidden bg-cream py-20 sm:py-24">
      <div className="pattern-contour absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="shell relative">
        <Reveal>
          <p className="eyebrow eyebrow-line text-saffron-700">Mahotsav venue</p>
          <h1 className="mt-5 max-w-2xl text-[2.5rem] leading-[1.06] font-semibold tracking-[-0.04em] text-bark-900 sm:text-[3.5rem]">
            Find the official venue.
          </h1>
          <p className="mt-7 max-w-xl text-[1.02rem] leading-[1.8] text-ink-600">
            The central Mahotsav celebration gathers at Kulti Golf Ground in Kulti. Every visitor
            can open the official location and travel directions without creating an account.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          {VENUES.map((venue, index) => (
            <Reveal key={venue.name} delay={index * 0.08}>
              <article
                className={cn(
                  "relative overflow-hidden rounded-[2rem] border border-line bg-white shadow-soft",
                  index === 0 ? "ring-2 ring-saffron-500" : "",
                )}
              >
                <VenueVisual className="aspect-[4/5] rounded-t-[2rem] rounded-b-[1.75rem]" />
                <div className="p-6 sm:p-8">
                  <p className="mt-3 text-sm leading-[1.8] text-ink-600">{venue.description}</p>
                  <dl className="mt-6 grid gap-px overflow-hidden rounded-xl border bg-bark-950 text-ivory sm:grid-cols-2">
                    <div className="border-b border-line p-4 sm:border-r sm:border-b-0">
                      <dt className="text-[0.62rem] font-bold tracking-[0.14em] text-gold-300 uppercase">
                        Location
                      </dt>
                      <dd className="mt-1.5 text-sm font-semibold text-white">{venue.location}</dd>
                    </div>
                    <div className="p-4">
                      <dt className="text-[0.62rem] font-bold tracking-[0.14em] text-gold-300 uppercase">
                        Access
                      </dt>
                      <dd className="mt-1.5 text-sm font-semibold text-white">
                        Open to every visitor
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <ButtonLink
                      href={venue.directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="primary"
                      size="sm"
                    >
                      Get directions <ArrowRight className="h-3.5 w-3.5" />
                    </ButtonLink>
                    <ButtonLink
                      href={venue.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outline-light"
                      size="sm"
                    >
                      Open in Google Maps
                    </ButtonLink>
                  </div>
                  <p className="mt-4 text-[0.68rem] leading-relaxed text-gold-300/50">
                    {venue.credit}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2} className="mt-16">
          <div className="relative overflow-hidden rounded-[2rem] border border-line bg-white p-6 text-center sm:p-10">
            <div className="pattern-jaali absolute inset-0 opacity-40" aria-hidden="true" />
            <div className="relative mx-auto max-w-2xl">
              <p className="text-lg font-semibold text-bark-900">
                Need more information about the platform?
              </p>
              <Link
                href="/about"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-saffron-700 hover:text-saffron-800"
              >
                Visit the About page <ArrowRight />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
