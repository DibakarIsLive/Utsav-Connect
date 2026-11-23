import { cn } from "@/ui/lib/cn";

/**
 * Consistent label + hint + error wrapper for every form control.
 */
export default function Field({
  id,
  label,
  hint,
  error,
  required = false,
  children,
  className = "",
  labelClassName = "",
}) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={cn("label-base", labelClassName)}>
          {label}
          {required ? <span className="ml-1 text-saffron-700">*</span> : null}
        </label>
        {hint ? <span className="mb-2 text-[0.7rem] text-ink-400">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({ className = "", invalid = false, ...props }) {
  return (
    <input
      className={cn("input-base", invalid && "border-red-400 focus:border-red-500", className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function SelectInput({ className = "", invalid = false, children, ...props }) {
  return (
    <div className="relative">
      <select
        className={cn(
          "input-base appearance-none pr-10",
          invalid && "border-red-400 focus:border-red-500",
          className,
        )}
        aria-invalid={invalid || undefined}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-ink-400"
        fill="none"
      >
        <path
          d="m5.5 8 4.5 4.5L14.5 8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function TextArea({ className = "", invalid = false, ...props }) {
  return (
    <textarea
      className={cn(
        "input-base min-h-28 resize-y leading-relaxed",
        invalid && "border-red-400 focus:border-red-500",
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}
