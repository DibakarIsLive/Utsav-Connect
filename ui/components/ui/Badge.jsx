import { cn } from "@/ui/lib/cn";

const TONES = {
  neutral: "border-line bg-cream text-ink-700",
  saffron: "border-saffron-200 bg-saffron-50 text-saffron-800",
  gold: "border-gold-200 bg-gold-50 text-gold-800",
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-200 bg-red-50 text-red-700",
  blue: "border-sky-200 bg-sky-50 text-sky-800",
  dark: "border-white/15 bg-white/10 text-ivory",
  outline: "border-bark-200 bg-transparent text-bark-800",
};

export default function Badge({ tone = "neutral", dot = false, className = "", children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-bold tracking-[0.07em] uppercase",
        TONES[tone] ?? TONES.neutral,
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

const STATUS_TONES = {
  active: "green",
  approved: "green",
  available: "green",
  pending: "amber",
  pending_approval: "amber",
  pending_verification: "blue",
  flagged: "amber",
  invalid: "red",
  rejected: "red",
  suspended: "red",
  archived: "neutral",
  needs_correction: "amber",
  duplicate: "blue",
  unavailable: "neutral",
  exceeds_100: "amber",
};

/**
 * Map a domain status string to a consistent badge.
 */
export function StatusBadge({ status, children }) {
  const key = String(status ?? "").toLowerCase();
  return (
    <Badge tone={STATUS_TONES[key] ?? "neutral"} dot>
      {children ?? (key.replaceAll("_", " ") || "unknown")}
    </Badge>
  );
}
