"use client";

import { useEffect, useRef, useState } from "react";
import { parsePhoneNumber } from "libphonenumber-js";
import { cn } from "@/ui/lib/cn";

/**
 * Supported countries for the phone country-code selector.
 * Each entry: ISO code, display name, calling code, flag emoji.
 */
export const COUNTRIES = [
  { code: "IN", name: "India", callingCode: "91", flag: "🇮🇳" },
  { code: "US", name: "United States", callingCode: "1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", callingCode: "44", flag: "🇬🇧" },
  { code: "AE", name: "United Arab Emirates", callingCode: "971", flag: "🇦🇪" },
  { code: "SG", name: "Singapore", callingCode: "65", flag: "🇸🇬" },
  { code: "CA", name: "Canada", callingCode: "1", flag: "🇨🇦" },
  { code: "AU", name: "Australia", callingCode: "61", flag: "🇦🇺" },
  { code: "ZA", name: "South Africa", callingCode: "27", flag: "🇿🇦" },
  { code: "DE", name: "Germany", callingCode: "49", flag: "🇩🇪" },
  { code: "FR", name: "France", callingCode: "33", flag: "🇫🇷" },
];

export const DEFAULT_COUNTRY = "IN";

/**
 * Calling code lookup by ISO country code.
 */
export function callingCodeFor(countryCode) {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  return country ? country.callingCode : COUNTRIES[0].callingCode;
}

/**
 * Normalize a raw phone number to E.164 format for the selected country.
 *
 * The user enters only the national number; the selected country's calling
 * code is added automatically. A country calling code already present in the
 * input is not duplicated (e.g. "919876543210" with India → "+919876543210").
 *
 * Returns the E.164 number when libphonenumber-js validates it, otherwise a
 * best-effort "+<calling code><digits>" string. Returns "" for empty input.
 */
export function normalizePhone(raw, countryCode = DEFAULT_COUNTRY) {
  if (!raw) return "";

  const callingCode = callingCodeFor(countryCode);

  try {
    const parsed = parsePhoneNumber(raw);
    if (parsed?.isValid()) {
      return parsed.number;
    }
  } catch {}

  const digits = raw.replace(/\D/g, "");

  if (digits.startsWith(callingCode)) {
    const full = `+${digits}`;
    try {
      const parsed = parsePhoneNumber(full, countryCode);
      return parsed?.isValid() ? parsed.number : full;
    } catch {
      return full;
    }
  }

  const full = `+${callingCode}${digits}`;
  try {
    const parsed = parsePhoneNumber(full, countryCode);
    return parsed?.isValid() ? parsed.number : full;
  } catch {
    return full;
  }
}

/**
 * Phone input with a separate country-code selector.
 *
 * When the selector is CLOSED, only the flag and calling code are shown
 * (e.g. "🇮🇳 +91") so the selector stays compact (~120px). When OPEN, the
 * full country name, flag and calling code are shown in each option.
 *
 * The `value` and `onChange` props use E.164 format (e.g. "+919876543210").
 * Internally, the country code and local number are kept in separate state.
 */
export function PhoneInput({
  id,
  name,
  value,
  onChange,
  invalid = false,
  placeholder,
  required = false,
  ariaDescribedBy,
  className = "",
}) {
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [local, setLocal] = useState("");
  const lastEmitted = useRef(null);

  // Sync internal state from an EXTERNAL E.164 value. When the change came
  // from this input, the parent is merely echoing our normalized value back;
  // re-parsing it would overwrite the raw text and move the caret mid-typing.
  useEffect(() => {
    if (value === lastEmitted.current) return;
    if (!value) {
      setLocal("");
      return;
    }
    try {
      const parsed = parsePhoneNumber(value);
      if (parsed?.country) {
        setCountry(parsed.country);
        setLocal(parsed.nationalNumber || "");
      } else {
        setLocal(value);
      }
    } catch {
      setLocal(value);
    }
  }, [value]);

  function handlePhoneChange(event) {
    const raw = event.target.value;
    setLocal(raw);
    const normalized = normalizePhone(raw, country);
    lastEmitted.current = normalized;
    onChange(normalized);
  }

  function handleCountryChange(event) {
    const newCode = event.target.value;
    setCountry(newCode);
    const digits = local.replace(/\D/g, "");
    const normalized = normalizePhone(digits, newCode);
    lastEmitted.current = normalized;
    onChange(normalized);
  }

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row", className)}>
      <div className="relative shrink-0">
        <select
          id={`${id}-country`}
          value={country}
          onChange={handleCountryChange}
          className={cn(
            "input-base w-22.5 appearance-none pr-8 pl-3",
            invalid && "border-red-400 focus:border-red-500",
          )}
          aria-label="Country code"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code} label={`${c.flag} +${c.callingCode}`}>
              {c.flag} {c.name} (+{c.callingCode})
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-ink-400"
          fill="none"
        >
          <path
            d="m5.5 8 4.5 4.5L14.5 8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <input
          id={id}
          name={name}
          type="tel"
          value={local}
          onChange={handlePhoneChange}
          placeholder={placeholder || "Phone number"}
          aria-invalid={invalid || undefined}
          aria-describedby={ariaDescribedBy}
          required={required}
          autoComplete="tel"
          className={cn("input-base w-full", invalid && "border-red-400 focus:border-red-500")}
        />
      </div>
    </div>
  );
}

export default PhoneInput;
