import { cn } from "@/ui/lib/cn";

/**
 * Utsav-Connect mark: a saffron arch, a rising flame, and a lotus seat.
 * Drawn as inline SVG so it stays crisp at every size and needs no request.
 */
export function UtsavMark({ className = "", tone = "warm" }) {
  const arch = tone === "light" ? "#fff9ef" : "#431806";
  const flame = tone === "light" ? "#fff9ef" : "#fff9ef";
  const seat = tone === "light" ? "#d99a38" : "#d99a38";

  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="Utsav-Connect"
      className={cn("h-11 w-11", className)}
    >
      <rect x="1" y="1" width="46" height="46" rx="14" fill="url(#utsav-mark-bg)" />
      <path
        d="M12 34V24c0-7.2 5.4-13 12-13s12 5.8 12 13v10"
        fill="none"
        stroke={arch}
        strokeOpacity="0.35"
        strokeWidth="1.2"
      />
      <path
        d="M24 12c2.6 3.4 4 6.8 4 9.7 0 3.2-1.8 5.5-4 7.3-2.2-1.8-4-4.1-4-7.3 0-2.9 1.4-6.3 4-9.7Z"
        fill={flame}
      />
      <path
        d="M24 14.6c1.4 2.1 2.2 4.1 2.2 5.6 0 1.7-.9 2.9-2.2 3.9-1.3-1-2.2-2.2-2.2-3.9 0-1.5.8-3.5 2.2-5.6Z"
        fill="#e85b00"
      />
      <path
        d="M15.5 33c2.6-2.4 5.4-3.6 8.5-3.6s5.9 1.2 8.5 3.6c-2.8 1.6-5.6 2.4-8.5 2.4s-5.7-.8-8.5-2.4Z"
        fill={seat}
      />
      <defs>
        <linearGradient id="utsav-mark-bg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c04602" />
          <stop offset="0.55" stopColor="#e85b00" />
          <stop offset="1" stopColor="#98380a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Brand lockup used by the public header and footer.
 */
export default function Logo({ tone = "dark", className = "", showTagline = true }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <UtsavMark />
      <span className="leading-none">
        <span
          className={cn(
            "font-display block text-[1.35rem] font-semibold tracking-[-0.03em]",
            tone === "light" ? "text-white" : "text-bark-900",
          )}
        >
          Utsav<span className="text-gold-400">·</span>Connect
        </span>
        {showTagline ? (
          <span
            className={cn(
              "mt-1.5 block text-[0.58rem] font-bold tracking-[0.22em] uppercase",
              tone === "light" ? "text-white/60" : "text-bark-500",
            )}
          >
            Mahotsav outreach
          </span>
        ) : null}
      </span>
    </span>
  );
}
