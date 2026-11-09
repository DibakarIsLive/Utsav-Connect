import { cn } from "@/ui/lib/cn";

/**
 * A small lotus-and-line divider used to separate editorial sections.
 */
export function LotusDivider({ className = "", tone = "light" }) {
  const color = tone === "dark" ? "currentColor" : "currentColor";
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3",
        tone === "dark" ? "text-gold-400" : "text-gold-500",
        className,
      )}
      aria-hidden="true"
    >
      <span className="h-px w-14 bg-current opacity-35" />
      <svg viewBox="0 0 40 24" className="h-5 w-10" fill="none">
        <path
          d="M20 3c2.6 3.2 4 6 4 8.4 0 2.6-1.6 4.7-4 6.1-2.4-1.4-4-3.5-4-6.1C16 9 17.4 6.2 20 3Z"
          fill={color}
          opacity="0.85"
        />
        <path
          d="M20 17.5c-3.6-2.2-7.4-2.8-11.4-1.8 1.1 1.1 2.5 2 4.2 2.5 2.4.7 4.8.5 7.2-.7Zm0 0c3.6-2.2 7.4-2.8 11.4-1.8-1.1 1.1-2.5 2-4.2 2.5-2.4.7-4.8.5-7.2-.7Z"
          fill={color}
          opacity="0.5"
        />
      </svg>
      <span className="h-px w-14 bg-current opacity-35" />
    </div>
  );
}

/**
 * Subtle arch outline used behind image cards and empty panels.
 */
export function ArchTexture({ className = "" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 300"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      preserveAspectRatio="none"
      fill="none"
    >
      <path
        d="M30 290V150C30 80 105 25 200 25s170 55 170 125v140"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.16"
      />
      <path
        d="M62 290V158c0-58 62-102 138-102s138 44 138 102v132"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.11"
      />
      <path
        d="M96 290V168c0-46 47-81 104-81s104 35 104 81v122"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.07"
      />
    </svg>
  );
}

/**
 * Decorative corner flourish for dark hero panels.
 */
export function CornerFlourish({ className = "", flip = false }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className={cn("pointer-events-none absolute h-28 w-28 text-gold-500/30", flip && "-scale-x-100", className)}
      fill="none"
    >
      <path d="M2 118V60C2 28 28 2 60 2h58" stroke="currentColor" strokeWidth="1" />
      <path d="M14 118V64c0-27 22-50 50-50h54" stroke="currentColor" strokeWidth="0.7" opacity="0.7" />
      <path
        d="M34 34c10 2 17 8 20 18-10-2-17-8-20-18Z"
        fill="currentColor"
        opacity="0.5"
      />
    </svg>
  );
}
