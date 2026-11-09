import { cn } from "@/ui/lib/cn";

/**
 * Consistent page header for the administrative workspace. It keeps title,
 * context, and the primary action in one predictable place across sections.
 */
export default function AdminPageHeader({
  eyebrow = "Admin workspace",
  title,
  description,
  actions,
  className = "",
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        <p className="eyebrow text-saffron-700 eyebrow-line">{eyebrow}</p>
        <h1 className="text-bark-900 mt-3 text-[1.9rem] leading-[1.08] font-semibold tracking-[-0.035em] sm:text-[2.3rem]">
          {title}
        </h1>
        {description ? (
          <p className="text-ink-500 mt-2.5 text-[0.9rem] leading-relaxed">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}
