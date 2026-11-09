import { cn } from "@/ui/lib/cn";

const TONES = {
  info: {
    box: "border-sky-200 bg-sky-50/80 text-sky-900",
    title: "text-sky-950",
    icon: "text-sky-600",
    path: (
      <path
        d="M10 6.5v.2M10 9v5m7-2a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    ),
  },
  success: {
    box: "border-emerald-200 bg-emerald-50/80 text-emerald-900",
    title: "text-emerald-950",
    icon: "text-emerald-600",
    path: (
      <path
        d="m6 10.5 2.8 2.8L14.5 7M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  warning: {
    box: "border-amber-200 bg-amber-50/85 text-amber-900",
    title: "text-amber-950",
    icon: "text-amber-600",
    path: (
      <path
        d="M10 7v4m0 3v.2M8.6 3.9 3.3 15.1A1.5 1.5 0 0 0 4.7 17h10.6a1.5 1.5 0 0 0 1.4-1.9L11.4 3.9a1.5 1.5 0 0 0-2.8 0Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  error: {
    box: "border-red-200 bg-red-50/85 text-red-900",
    title: "text-red-950",
    icon: "text-red-600",
    path: (
      <path
        d="M10 6.5v4.2m0 2.8v.2M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    ),
  },
};

/**
 * Inline notice for form and workspace feedback. It is intentionally compact
 * so it can live inside cards without stealing the page hierarchy.
 */
export default function Notice({ tone = "info", title, children, className = "", role = "status" }) {
  const styles = TONES[tone] ?? TONES.info;
  return (
    <div
      role={tone === "error" ? "alert" : role}
      className={cn("rounded-2xl border px-4 py-3.5", styles.box, className)}
    >
      <div className="flex items-start gap-3">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={cn("mt-0.5 h-4.5 w-4.5 shrink-0", styles.icon)}
          fill="none"
        >
          {styles.path}
        </svg>
        <div className="min-w-0 text-[0.8rem] leading-relaxed">
          {title ? <p className={cn("font-bold", styles.title)}>{title}</p> : null}
          {children ? <div className={title ? "mt-1" : ""}>{children}</div> : null}
        </div>
      </div>
    </div>
  );
}
