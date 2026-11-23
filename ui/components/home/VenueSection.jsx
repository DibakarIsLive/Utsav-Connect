"use client";

import Image from "next/image";
import { useState } from "react";
import { ButtonLink, ArrowRight } from "@/ui/components/ui/Button";

const VENUE_MAP_URL = "https://maps.app.goo.gl/BcY87xSjA6iRtBY78";
const DIRECTIONS_URL = "https://www.google.com/maps/dir/?api=1&destination=Kulti+Golf+Ground";

/**
 * Official Mahotsav venue: Kulti Golf Ground, Kulti.
 *
 * The destination is the exact verified short link supplied for the project.
 * Get Directions opens Google Maps directions to Kulti Golf Ground using the
 * visitor's current location as the origin when supported. No coordinates are
 * invented — the short link and destination name are the verified references.
 */
export default function VenueSection() {
  const [copied, setCopied] = useState(false);

  async function copyVenueLink() {
    try {
      await navigator.clipboard.writeText(VENUE_MAP_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      aria-labelledby="venue-heading"
      className="relative overflow-hidden bg-cream py-20 sm:py-24"
    >
      <div className="pattern-contour absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="shell relative">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <p className="eyebrow eyebrow-line text-saffron-700">Official Mahotsav venue</p>
            <h2
              id="venue-heading"
              className="mt-5 max-w-xl text-[2.2rem] leading-[1.06] font-semibold tracking-[-0.04em] text-bark-900 sm:text-[3.1rem]"
            >
              Kulti Golf Ground,
              <br />
              Kulti
            </h2>
            <p className="mt-5 max-w-lg text-[1.02rem] leading-[1.8] text-ink-600">
              The central Mahotsav celebration gathers at Kulti Golf Ground in Kulti. Every visitor
              can open the official location and travel directions without creating an account.
            </p>

            <dl className="mt-8 grid max-w-lg gap-px overflow-hidden rounded-2xl border border-line bg-white sm:grid-cols-2">
              <div className="border-b border-line p-4 sm:border-r sm:border-b-0">
                <dt className="text-[0.62rem] font-bold tracking-[0.14em] text-ink-400 uppercase">
                  Location
                </dt>
                <dd className="mt-1.5 text-sm font-semibold text-bark-900">Kulti, West Bengal</dd>
              </div>
              <div className="p-4">
                <dt className="text-[0.62rem] font-bold tracking-[0.14em] text-ink-400 uppercase">
                  Access
                </dt>
                <dd className="mt-1.5 text-sm font-semibold text-bark-900">
                  Open to every visitor
                </dd>
              </div>
            </dl>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink
                href={DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                variant="primary"
                size="lg"
              >
                Get directions
                <ArrowRight />
              </ButtonLink>
              <ButtonLink
                href={VENUE_MAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
                size="lg"
              >
                Open in Google Maps
              </ButtonLink>
              <button
                type="button"
                onClick={copyVenueLink}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-ink-500 transition-colors hover:text-bark-900"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none">
                  <path
                    d="M7.5 7.5V5.2c0-.7.5-1.2 1.2-1.2h6.1c.7 0 1.2.5 1.2 1.2v6.1c0 .7-.5 1.2-1.2 1.2h-2.3M5.2 7.5h6.1c.7 0 1.2.5 1.2 1.2v6.1c0 .7-.5 1.2-1.2 1.2H5.2c-.7 0-1.2-.5-1.2-1.2V8.7c0-.7.5-1.2 1.2-1.2Z"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                {copied ? "Link copied" : "Copy official link"}
              </button>
            </div>
            <p className="mt-5 max-w-md text-[0.72rem] leading-relaxed text-ink-400">
              Directions open in Google Maps and use your current location as the starting point
              when your device allows it. The short link above is the verified official venue
              destination.
            </p>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-t-[10rem] rounded-b-[1.75rem] border-4 border-line border-white bg-bark-900 shadow-[var(--shadow-arch)]">
              <div className="relative aspect-[4/5]">
                <Image
                  src="/images/ashram/deoghar-courtyard.webp"
                  alt="Kulti Golf Ground, the official Mahotsav venue"
                  fill
                  priority
                  loading="eager"
                  sizes="(min-width: 1024px) 44vw, 90vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bark-950/85 via-bark-950/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <p className="text-[0.62rem] font-bold tracking-[0.18em] text-gold-300 uppercase">
                    Kulti Golf Ground
                  </p>
                  <p className="mt-1.5 font-display text-xl font-semibold text-ivory">
                    The heart of the Mahotsav
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-4 flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-soft sm:-left-8">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-saffron-50 text-saffron-700">
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none">
                  <path
                    d="M10 18s6-5.1 6-9.5A6 6 0 0 0 4 8.5C4 12.9 10 18 10 18Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <circle cx="10" cy="8.5" r="1.9" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </span>
              <div>
                <p className="text-[0.6rem] font-bold tracking-[0.14em] text-ink-400 uppercase">
                  Venue destination
                </p>
                <p className="text-xs font-semibold text-bark-900">Verified official link</p>
              </div>
            </div>

            <p className="absolute top-1/2 -right-2 hidden -translate-y-1/2 rotate-90 text-[0.58rem] font-bold tracking-[0.2em] text-ink-400 uppercase lg:block">
              Photo · Pinakpani · CC BY 4.0
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
