import { VENUE_LOCALITY, VENUE_NAME } from "@/ui/lib/venue";
import { cn } from "@/ui/lib/cn";

/**
 * Deliberately illustrative venue panel.
 *
 * The project has no photograph of Kulti Golf Ground. Publishing a Deoghar
 * Ashram photograph under a Kulti caption would be misleading, so this panel
 * is clearly a map illustration and never claims to be a photograph.
 */
export default function VenueVisual({ className }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border-4 border-line border-white bg-bark-900 shadow-[var(--shadow-arch)]",
        className,
      )}
      role="img"
      aria-label={`Illustrated locator panel for ${VENUE_NAME}, ${VENUE_LOCALITY}. Not a photograph.`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#6b2c0f_0%,#431806_45%,#1b0d06_100%)]" />
      <div className="pattern-contour absolute inset-0 opacity-20" aria-hidden="true" />

      <svg
        viewBox="0 0 400 500"
        className="absolute inset-0 h-full w-full"
        fill="none"
        aria-hidden="true"
      >
        <g stroke="#d99a38" strokeOpacity="0.28" strokeWidth="1.4">
          <path d="M-20 130C70 90 120 160 210 120s150-20 220 30" />
          <path d="M-30 210C60 165 140 235 225 195s130-15 205 35" />
          <path d="M-20 300C80 255 135 330 230 285s135-10 200 40" />
          <path d="M-30 390C65 350 145 415 235 375s130-5 205 45" />
          <path d="M40 -20C20 80 95 130 65 215s20 150 5 305" />
          <path d="M150 -20C130 85 205 145 175 235s20 145 5 285" />
          <path d="M265 -20C245 80 315 145 285 230s20 150 5 290" />
        </g>
        <g stroke="#fff9ef" strokeOpacity="0.13" strokeWidth="1">
          <path d="M-10 70C90 35 150 95 260 60s120-10 170 15" />
          <path d="M-10 345C90 310 160 370 270 335s120-5 150 15" />
          <path d="M95 -10C75 90 145 160 110 250s30 170 15 270" />
          <path d="M320 -10C300 95 370 165 335 250s25 170 10 270" />
        </g>

        <circle cx="200" cy="235" r="86" fill="#e85b00" fillOpacity="0.12" />
        <circle cx="200" cy="235" r="52" fill="#e85b00" fillOpacity="0.18" />
        <path
          d="M200 178c-22 0-40 18-40 40 0 30 40 64 40 64s40-34 40-64c0-22-18-40-40-40Z"
          fill="#fff9ef"
          stroke="#431806"
          strokeWidth="3"
        />
        <circle cx="200" cy="218" r="13" fill="#e85b00" />
        <path
          d="M145 305h110"
          stroke="#fff9ef"
          strokeOpacity="0.5"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      <div className="absolute inset-0 bg-gradient-to-t from-bark-950/90 via-bark-950/5 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6">
        <p className="text-[0.62rem] font-bold tracking-[0.18em] text-gold-300 uppercase">
          {VENUE_NAME}
        </p>
        <p className="mt-1.5 font-display text-xl font-semibold text-ivory">
          The heart of the Mahotsav
        </p>
        <p className="mt-1 text-[0.68rem] text-ivory/55">{VENUE_LOCALITY}</p>
      </div>

      <span className="absolute top-5 right-5 rounded-full border border-white/20 bg-bark-950/60 px-3 py-1 text-[0.58rem] font-semibold tracking-[0.12em] text-ivory/70 uppercase backdrop-blur">
        Illustrative map · not a photo
      </span>
    </div>
  );
}
