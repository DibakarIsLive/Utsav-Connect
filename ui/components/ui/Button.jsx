import Link from "next/link";
import { cn } from "@/ui/lib/cn";

const VARIANTS = {
  primary:
    "bg-saffron-600 text-white shadow-[0_12px_30px_-14px_rgba(232,91,0,0.85)] hover:bg-saffron-700 active:translate-y-px",
  dark: "bg-bark-900 text-ivory shadow-[0_12px_30px_-16px_rgba(43,15,4,0.7)] hover:bg-bark-950 active:translate-y-px",
  gold: "bg-gold-500 text-bark-950 shadow-[0_12px_30px_-16px_rgba(217,154,56,0.9)] hover:bg-gold-400 active:translate-y-px",
  secondary:
    "border border-line bg-white/80 text-bark-900 hover:border-gold-400 hover:bg-white active:translate-y-px",
  outline:
    "border border-bark-300/70 text-bark-900 hover:border-bark-900 hover:bg-bark-900 hover:text-ivory active:translate-y-px",
  "outline-light":
    "border border-white/35 text-white hover:border-white hover:bg-white/10 active:translate-y-px",
  ghost: "text-bark-800 hover:bg-bark-50 hover:text-bark-950",
  danger:
    "bg-red-700 text-white shadow-[0_12px_30px_-16px_rgba(185,28,28,0.8)] hover:bg-red-800 active:translate-y-px",
};

const SIZES = {
  sm: "min-h-9 px-3.5 text-[0.78rem] gap-1.5 rounded-lg",
  md: "min-h-11 px-5 text-[0.84rem] gap-2 rounded-xl",
  lg: "min-h-13 px-6.5 text-[0.9rem] gap-2.5 rounded-xl",
};

/**
 * Shared button styling for links and native buttons.
 */
export function buttonClass({ variant = "primary", size = "md", className = "" } = {}) {
  return cn(
    "inline-flex items-center justify-center font-semibold tracking-[0.01em] transition-all duration-200 disabled:pointer-events-none disabled:opacity-55",
    VARIANTS[variant] ?? VARIANTS.primary,
    SIZES[size] ?? SIZES.md,
    className,
  );
}

export function Button({ variant, size, className, type = "button", children, ...props }) {
  return (
    <button type={type} className={buttonClass({ variant, size, className })} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant, size, className, children, ...props }) {
  return (
    <Link href={href} className={buttonClass({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}

export function ArrowRight({ className = "h-4 w-4" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M4 10h11m0 0-4.2-4.2M15 10l-4.2 4.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
