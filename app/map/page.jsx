import Image from "next/image";
import Link from "next/link";
import Reveal from "@/ui/components/ui/Reveal";
import { ButtonLink, ArrowRight } from "@/ui/components/ui/Button";
import { cn } from "@/ui/lib/cn";

const VENUE_MAP_URL = "https://maps.app.goo.gl/BcY87xSjA6iRtBY78";
const DIRECTIONS_URL = "https://www.google.com/maps/dir/?api=1&destination=Kulti+Golf+Ground";

const VENUES = [
  {
    name: "Kulti Golf Ground",
    location: "Kulti, West Bengal",
    description: "The official Mahotsav venue where the central celebration gathers.",
    mapUrl: VENUE_MAP_URL,
    directionsUrl: DIRECTIONS_URL,
    image: "/images/ashram/deoghar-courtyard.webp",
    imageAlt: "Kulti Golf Ground, the official Mahotsav venue",
    credit: "Photograph by Pinakpani · CC BY 4.0",
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
    <div className="bg-cream relative overflow-hidden py-20 sm:py-24">
      <div className="pattern-contour absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="shell relative">
        <Reveal>
          <p className="eyebrow text-saffron-700 eyebrow-line">Mahotsav venue</p>
          <h1 className="text-bark-900 mt-5 max-w-2xl text-[2.5rem] leading-[1.06] font-semibold tracking-[-0.04em] sm:text-[3.5rem]">
            Find the official venue.
          </h1>
          <p className="text-ivory/60 mt-7 max-w-xl text-[1.02rem] leading-[1.8]">
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
                <div className="relative aspect-[4/5] overflow-hidden rounded-t-[2rem]">
                  <Image
                    src={venue.image}
                    alt={venue.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 44vw, 90vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-bark-950/80 via-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="text-[0.62rem] font-bold tracking-[0.18em] uppercase text-gold-300">
                      {venue.name}
                    </p>
                    <p className="font-display mt-1 text-lg font-semibold text-ivory">
                      The heart of the Mahotsav
                    </p>
                  </div>
                </div>
                <div className="p-6 sm:p-8">
                  <p className="text-ink-600 mt-3 text-sm leading-[1.8]">
                    {venue.description}
                  </p>
                  <dl className="mt-6 grid gap-px overflow-hidden rounded-xl border bg-bark-950 sm:grid-cols-2 text-ivory">
                    <div className="border-line border-b p-4 sm:border-r sm:border-b-0">
                      <dt className="text-gold-300 text-[0.62rem] font-bold tracking-[0.14em] uppercase">
                        Location
                      </dt>
                      <dd className="text-white mt-1.5 text-sm font-semibold">
                        {venue.location}
                      </dd>
                    </div>
                    <div className="p-4">
                      <dt className="text-gold-300 text-[0.62rem] font-bold tracking-[0.14em] uppercase">
                        Access
                      </dt>
                      <dd className="text-white mt-1.5 text-sm font-semibold">
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
                  <p className="text-gold-300/50 mt-4 text-[0.68rem] leading-relaxed">
                    {venue.credit}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2} className="mt-16">
          <div className="border-line bg-white relative overflow-hidden rounded-[2rem] border p-6 sm:p-10 text-center">
            <div className="pattern-jaali absolute inset-0 opacity-40" aria-hidden="true" />
            <div className="relative mx-auto max-w-2xl">
              <p className="text-bark-900 text-lg font-semibold">
                Need more information about the platform?
              </p>
              <Link
                href="/about"
                className="mt-4 inline-flex items-center gap-1.5 text-saffron-700 hover:text-saffron-800 text-sm font-semibold"
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
