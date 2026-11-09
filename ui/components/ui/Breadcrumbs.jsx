import Link from "next/link";
import { cn } from "@/ui/lib/cn";

/**
 * Breadcrumb trail. The final item is the current page and is not linked.
 */
export default function Breadcrumbs({ items = [], tone = "light", className = "" }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-[0.72rem] font-semibold", className)}>
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className={tone === "dark" ? "text-white/25" : "text-ink-300"}
                >
                  /
                </span>
              ) : null}
              {last || !item.href ? (
                <span
                  aria-current={last ? "page" : undefined}
                  className={tone === "dark" ? "text-ivory/70" : "text-ink-500"}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "transition-colors",
                    tone === "dark"
                      ? "text-ivory/50 hover:text-ivory"
                      : "text-ink-400 hover:text-bark-800",
                  )}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
