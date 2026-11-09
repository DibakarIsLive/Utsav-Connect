import { cn } from "@/ui/lib/cn";

const ICONS = {
  map: (
    <path
      d="M9 3 3.8 5.1v15.4L9 18.4l6 2.1 5.2-2.1V3.1L15 5.2 9 3Zm0 0v15.4m6-13.2v15.3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  report: (
    <path
      d="M6 3.8h9l3 3V20H6V3.8Zm3 5h6m-6 4h6m-6 4h3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  ),
  search: (
    <path
      d="m20 20-4.4-4.4m1.4-5.1a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  ),
  people: (
    <path
      d="M16 19v-1.4c0-2.2-1.8-4-4-4H7c-2.2 0-4 1.8-4 4V19m19 0v-1.4c0-2.2-1.8-4-4-4h-1.2M13.5 6.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm6.8.2a3 3 0 0 1 0 5.6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  ),
};

export default function EmptyState({
  icon = "search",
  title,
  description,
  action,
  className = "",
  tone = "light",
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-dashed px-6 py-14 text-center",
        tone === "dark"
          ? "border-white/20 bg-white/[0.03] text-ivory"
          : "border-line bg-white/60 text-ink-700",
        className,
      )}
    >
      <span
        className={cn(
          "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl",
          tone === "dark" ? "bg-white/10 text-gold-300" : "bg-saffron-50 text-saffron-700",
        )}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
          {ICONS[icon] ?? ICONS.search}
        </svg>
      </span>
      <h3
        className={cn(
          "font-display text-xl font-semibold",
          tone === "dark" ? "text-ivory" : "text-bark-900",
        )}
      >
        {title}
      </h3>
      {description ? (
        <p
          className={cn(
            "mt-2 max-w-md text-sm leading-relaxed",
            tone === "dark" ? "text-ivory/60" : "text-ink-500",
          )}
        >
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
