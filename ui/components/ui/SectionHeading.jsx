import { cn } from "@/ui/lib/cn";

/**
 * Editorial section heading with optional eyebrow, action, and tone.
 */
export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  tone = "dark",
  action,
  className = "",
  titleClassName = "",
}) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "flex flex-col gap-5",
        centered ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className={cn("max-w-2xl", centered && "mx-auto")}>
        {eyebrow ? (
          <p
            className={cn(
              "eyebrow mb-3",
              tone === "light" ? "text-gold-300" : "text-saffron-700",
              centered && "justify-center",
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={cn(
            "text-[2.05rem] leading-[1.08] font-semibold tracking-[-0.035em] sm:text-[2.7rem]",
            tone === "light" ? "text-ivory" : "text-bark-900",
            titleClassName,
          )}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              "mt-4 text-[0.98rem] leading-[1.75]",
              tone === "light" ? "text-ivory/70" : "text-ink-600",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className={cn("shrink-0", centered && "mt-2")}>{action}</div> : null}
    </div>
  );
}
