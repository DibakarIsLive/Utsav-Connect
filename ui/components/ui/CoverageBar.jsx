import { cn } from "@/ui/lib/cn";
import { StatusBadge } from "@/ui/components/ui/Badge";

/**
 * Coverage visualisation with explicit unavailable and over-100 handling.
 * The bar is capped for drawing only; the printed value is never capped and
 * an over-100 result is labelled instead of hidden.
 */
export default function CoverageBar({
  percentage,
  status = "available",
  label = "Invitation coverage",
  compact = false,
  className = "",
}) {
  const unavailable = percentage === null || percentage === undefined;
  const exceeds = status === "exceeds_100" || (typeof percentage === "number" && percentage > 100);
  const width = unavailable ? 0 : Math.min(100, Math.max(0, percentage));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p
            className={cn(
              "font-semibold",
              compact ? "text-[0.7rem] tracking-[0.1em] uppercase" : "text-sm",
              "text-ink-500",
            )}
          >
            {label}
          </p>
          <p className="text-bark-900 mt-1 font-display text-2xl leading-none font-semibold">
            {unavailable ? "Unavailable" : `${percentage.toFixed(1)}%`}
          </p>
        </div>
        {exceeds ? <StatusBadge status="exceeds_100">Over 100%</StatusBadge> : null}
        {unavailable ? <StatusBadge status="unavailable">No estimate</StatusBadge> : null}
      </div>
      <div
        className="bg-cream relative h-2.5 overflow-hidden rounded-full"
        role="img"
        aria-label={
          unavailable
            ? "Coverage unavailable because no population estimate is recorded"
            : `${percentage.toFixed(1)} percent invitation coverage${exceeds ? ", above one hundred percent" : ""}`
        }
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-[width] duration-700",
            exceeds ? "bg-gradient-to-r from-gold-500 to-red-600" : "bg-gradient-to-r from-saffron-600 to-gold-400",
          )}
          style={{ width: `${width}%` }}
        />
        <div className="absolute inset-y-0 left-[100%] w-px bg-white/70" aria-hidden="true" />
      </div>
      {unavailable ? (
        <p className="text-ink-400 text-[0.72rem] leading-relaxed">
          A population estimate is required before coverage can be calculated. Zero is not assumed.
        </p>
      ) : exceeds ? (
        <p className="text-gold-800 text-[0.72rem] leading-relaxed">
          Reported invitations are higher than the recorded population estimate. The real value is
          shown above, not capped.
        </p>
      ) : null}
    </div>
  );
}
