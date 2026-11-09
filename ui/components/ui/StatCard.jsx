import { cn } from "@/ui/lib/cn";

/**
 * Dashboard statistic card. Values are always supplied by real API data;
 * the component never invents a fallback number.
 */
export default function StatCard({
  label,
  value,
  detail,
  icon,
  tone = "light",
  className = "",
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5",
        tone === "dark"
          ? "border-white/12 bg-white/[0.055] text-ivory"
          : "border-line bg-white shadow-[0_18px_50px_-44px_rgba(67,24,6,0.5)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-[0.68rem] font-bold tracking-[0.13em] uppercase",
            tone === "dark" ? "text-ivory/50" : "text-ink-400",
          )}
        >
          {label}
        </p>
        {icon ? (
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-xl",
              tone === "dark" ? "bg-white/10 text-gold-300" : "bg-saffron-50 text-saffron-700",
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "font-display mt-3 text-[2rem] leading-none font-semibold tracking-[-0.04em]",
          tone === "dark" ? "text-ivory" : "text-bark-900",
        )}
      >
        {value}
      </p>
      {detail ? (
        <p
          className={cn(
            "mt-2 text-[0.72rem] leading-relaxed",
            tone === "dark" ? "text-ivory/50" : "text-ink-400",
          )}
        >
          {detail}
        </p>
      ) : null}
    </div>
  );
}
