"use client";

import { useRef } from "react";
import { cn } from "@/ui/lib/cn";

/**
 * Accessible segmented control used for form modes and workspace filters.
 */
export default function Tabs({
  items,
  value,
  onChange,
  ariaLabel = "View",
  tone = "light",
  className = "",
  grow = false,
}) {
  const refs = useRef([]);

  function move(event, index) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % items.length;
    if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = items.length - 1;
    onChange(items[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex rounded-xl border p-1",
        tone === "dark"
          ? "border-white/15 bg-white/[0.06]"
          : "border-line bg-cream/80",
        grow ? "w-full" : "",
        className,
      )}
    >
      {items.map((item, index) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "relative inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3.5 py-1.5 text-[0.78rem] font-semibold whitespace-nowrap transition-all duration-200",
              grow ? "flex-1" : "",
              selected
                ? tone === "dark"
                  ? "bg-white text-bark-950 shadow-sm"
                  : "bg-white text-bark-900 shadow-sm"
                : tone === "dark"
                  ? "text-ivory/60 hover:text-ivory"
                  : "text-ink-500 hover:text-ink-800",
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[0.62rem] font-bold",
                  selected ? "bg-saffron-50 text-saffron-800" : "bg-ink-900/5 text-ink-500",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
