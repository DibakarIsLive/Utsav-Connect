"use client";

import { cn } from "@/ui/lib/cn";
import { useState } from "react";
import { ArrowRight } from "./Button";

/**
 * Text input with an independent show/hide password toggle.
 * Follows the same visual design as the Sign In page password toggle.
 */
export function PasswordInput({
  id,
  name,
  value,
  onChange,
  invalid = false,
  placeholder,
  autoComplete,
  required = false,
  ariaDescribedBy,
  className = "",
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={showPassword ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        aria-invalid={invalid || undefined}
        required={required}
        placeholder={placeholder}
        aria-describedby={ariaDescribedBy}
        className={cn(
          "input-base pr-14",
          invalid && "border-red-400 focus:border-red-500",
          className,
        )}
      />
      <button
        type="button"
        onClick={() => setShowPassword((value) => !value)}
        aria-label={showPassword ? "Hide password" : "Show password"}
        aria-pressed={showPassword}
        className="absolute top-1/2 right-3 min-h-8 -translate-y-1/2 rounded-lg px-2 text-[0.68rem] font-bold tracking-[0.08em] text-ink-400 uppercase hover:text-bark-900"
      >
        {showPassword ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export default PasswordInput;
