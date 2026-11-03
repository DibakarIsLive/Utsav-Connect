const VARIANTS = {
  info: {
    wrapper: "border-sky-200 bg-sky-50 text-sky-900",
    icon: "ℹ️",
    role: "status",
  },
  warning: {
    wrapper: "border-amber-300 bg-amber-50 text-amber-900",
    icon: "⚠️",
    role: "status",
  },
  success: {
    wrapper: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: "✅",
    role: "status",
  },
  error: {
    wrapper: "border-red-300 bg-red-50 text-red-900",
    icon: "⛔",
    role: "alert",
  },
};

/**
 * Inline notice for loading / empty / unavailable / error states
 * (roadmap Phase 1.6). Announced to assistive technology via its role.
 *
 * @param {{ variant?: keyof typeof VARIANTS, title: string, children?: React.ReactNode }} props
 */
export default function StatusNotice({ variant = "info", title, children }) {
  const styles = VARIANTS[variant] ?? VARIANTS.info;
  return (
    <div role={styles.role} className={`rounded-lg border px-4 py-3 ${styles.wrapper}`}>
      <p className="font-semibold">
        <span aria-hidden="true" className="mr-2">
          {styles.icon}
        </span>
        {title}
      </p>
      {children ? <div className="mt-1 text-sm leading-relaxed">{children}</div> : null}
    </div>
  );
}
