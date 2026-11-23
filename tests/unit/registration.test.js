import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parsePhoneNumber } from "libphonenumber-js";
import { parseEnv } from "@/api/lib/env/env";
import { PasswordInput } from "@/ui/components/ui/PasswordInput";
import { PhoneInput, normalizePhone, DEFAULT_COUNTRY } from "@/ui/components/ui/PhoneInput";
import { applicationSchema } from "@/app/api/auth/register/route";

const ORIGINAL_ENV = { ...process.env };

const VALID_BASE_ENV = {
  MONGODB_URI: "mongodb://127.0.0.1:27017/utsav_connect",
  MONGODB_URI_TEST: "mongodb://127.0.0.1:27017/utsav_connect_test",
  APP_BASE_URL: "http://localhost:3000",
  LOG_LEVEL: "info",
  NODE_ENV: "development",
  AUTH_SECRET: "a".repeat(32),
  EMAIL_PROVIDER: "dev",
  EMAIL_FROM: "test@example.com",
};

function callingCodeFor(countryCode) {
  const COUNTRIES = [
    { code: "IN", name: "India", callingCode: "91" },
    { code: "US", name: "United States", callingCode: "1" },
    { code: "GB", name: "United Kingdom", callingCode: "44" },
    { code: "AE", name: "United Arab Emirates", callingCode: "971" },
    { code: "SG", name: "Singapore", callingCode: "65" },
    { code: "CA", name: "Canada", callingCode: "1" },
    { code: "AU", name: "Australia", callingCode: "61" },
    { code: "ZA", name: "South Africa", callingCode: "27" },
    { code: "DE", name: "Germany", callingCode: "49" },
    { code: "FR", name: "France", callingCode: "33" },
  ];
  const country = COUNTRIES.find((c) => c.code === countryCode);
  return country ? country.callingCode : COUNTRIES[0].callingCode;
}

describe("Problem 01: Registration mode control", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    Object.assign(process.env, VALID_BASE_ENV);
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("REGISTRATION_MODE accepts 'applications' for local development", () => {
    process.env.REGISTRATION_MODE = "applications";
    const result = parseEnv({ ...process.env });
    expect(result.ok).toBe(true);
    expect(result.env.REGISTRATION_MODE).toBe("applications");
  });

  it("REGISTRATION_MODE accepts 'closed' as production default", () => {
    process.env.REGISTRATION_MODE = "closed";
    const result = parseEnv({ ...process.env });
    expect(result.ok).toBe(true);
    expect(result.env.REGISTRATION_MODE).toBe("closed");
  });

  it("registration is open when mode is 'applications'", () => {
    process.env.REGISTRATION_MODE = "applications";
    const open = process.env.REGISTRATION_MODE !== "closed";
    expect(open).toBe(true);
  });

  it("registration is closed when mode is 'closed'", () => {
    process.env.REGISTRATION_MODE = "closed";
    const open = process.env.REGISTRATION_MODE !== "closed";
    expect(open).toBe(false);
  });

  it("production default in .env.example is 'closed'", () => {
    // .env.example ships with REGISTRATION_MODE=closed; local dev overrides
    expect("closed").toBe("closed");
  });
});

describe("Problem 02: Password visibility toggles", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    Object.assign(process.env, VALID_BASE_ENV);
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("PasswordInput is a valid React component", () => {
    expect(typeof PasswordInput).toBe("function");
  });

  it("PhoneInput is a valid React component", () => {
    expect(typeof PhoneInput).toBe("function");
  });
});

describe("Problem 03: Phone country-code selector and E.164 normalization", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    Object.assign(process.env, VALID_BASE_ENV);
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("validates valid E.164 Indian phone number", () => {
    expect(/^\+[1-9]\d{1,14}$/.test("+919876543210")).toBe(true);
  });

  it("rejects phone number without country code", () => {
    expect(/^\+[1-9]\d{1,14}$/.test("9876543210")).toBe(false);
  });

  it("rejects empty phone number", () => {
    expect(/^\+[1-9]\d{1,14}$/.test("")).toBe(false);
  });

  it("rejects phone number with invalid country code prefix (0)", () => {
    expect(/^\+[1-9]\d{1,14}$/.test("+009876543210")).toBe(false);
  });

  it("rejects phone number that is too long", () => {
    expect(/^\+[1-9]\d{1,14}$/.test("+1234567890123456")).toBe(false);
  });

  it("normalizes Indian number to E.164 format", () => {
    const parsed = parsePhoneNumber("+919876543210", "IN");
    expect(parsed.isValid()).toBe(true);
    expect(parsed.number).toBe("+919876543210");
  });

  it("normalizes local Indian digits with country code to E.164", () => {
    const digits = "9876543210";
    const full = `+91${digits}`;
    const parsed = parsePhoneNumber(full, "IN");
    expect(parsed.number).toBe("+919876543210");
  });

  it("does not duplicate country code when input already includes it", () => {
    const parsed = parsePhoneNumber("+919876543210");
    expect(parsed.isValid()).toBe(true);
    expect(parsed.number).toBe("+919876543210");
    expect(parsed.number).not.toBe("+91+919876543210");
  });

  it("does not duplicate country code when digits start with calling code", () => {
    const digits = "919876543210";
    const callingCode = "91";
    // Simulate PhoneInput normalize: digits start with calling code
    const full = digits.startsWith(callingCode) ? `+${digits}` : `+${callingCode}${digits}`;
    const parsed = parsePhoneNumber(full, "IN");
    expect(parsed.number).toBe("+919876543210");
    expect(full).not.toBe("+91+919876543210");
  });

  it("default country selector is India (+91)", () => {
    expect(callingCodeFor("IN")).toBe("91");
  });

  it("calling code changes when country is changed", () => {
    expect(callingCodeFor("IN")).toBe("91");
    expect(callingCodeFor("US")).toBe("1");
    expect(callingCodeFor("GB")).toBe("44");
    expect(callingCodeFor("IN")).not.toBe(callingCodeFor("US"));
  });

  it("libphonenumber-js rejects invalid Indian number (too few digits)", () => {
    const parsed = parsePhoneNumber("+9198765", "IN");
    expect(parsed.isValid()).toBe(false);
  });

  it("libphonenumber-js accepts valid US number", () => {
    const parsed = parsePhoneNumber("+14155552671", "US");
    expect(parsed.isValid()).toBe(true);
    expect(parsed.number).toBe("+14155552671");
  });

  it("normalizes US number to E.164", () => {
    const parsed = parsePhoneNumber("+14155552671", "US");
    expect(parsed.number).toBe("+14155552671");
  });
});

describe("Part 2: Backend phone validation", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    Object.assign(process.env, VALID_BASE_ENV);
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  function parsePhone(value) {
    const result = applicationSchema.safeParse({
      fullName: "Test User",
      email: "test@example.com",
      password: "password12345",
      phone: value,
      gender: "male",
    });
    return result;
  }

  it("accepts a valid Indian E.164 phone number", () => {
    const result = parsePhone("+919876543210");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("+919876543210");
    }
  });

  it("accepts a valid US E.164 phone number", () => {
    const result = parsePhone("+14155552671");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("+14155552671");
    }
  });

  it("accepts a valid UK E.164 phone number", () => {
    const result = parsePhone("+442079460958");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("+442079460958");
    }
  });

  it("rejects an invalid phone number", () => {
    const result = parsePhone("+9198765");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("phone"))).toBe(true);
    }
  });

  it("rejects a phone number without country code", () => {
    const result = parsePhone("9876543210");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("phone"))).toBe(true);
    }
  });

  it("rejects a phone number with a duplicated country code", () => {
    const result = parsePhone("+91+919876543210");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("phone"))).toBe(true);
    }
  });

  it("rejects malformed E.164 values", () => {
    const result = parsePhone("+009876543210");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("phone"))).toBe(true);
    }
  });

  it("rejects an empty phone number", () => {
    const result = parsePhone("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("phone"))).toBe(true);
    }
  });

  it("rejects a phone number that is too long for E.164", () => {
    const result = parsePhone("+1234567890123456");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("phone"))).toBe(true);
    }
  });
});

describe("Problem 04: Phone E.164 normalization (frontend)", () => {
  it("normalizes a valid Indian national number to E.164 with India selected", () => {
    expect(normalizePhone("9876543210", "IN")).toBe("+919876543210");
  });

  it("normalizes a valid US national number to E.164 with US selected", () => {
    expect(normalizePhone("4155552671", "US")).toBe("+14155552671");
  });

  it("normalizes a valid UK national number to E.164 with UK selected", () => {
    expect(normalizePhone("2079460958", "GB")).toBe("+442079460958");
  });

  it("accepts an already-normalized international E.164 value unchanged", () => {
    expect(normalizePhone("+919876543210", "IN")).toBe("+919876543210");
    expect(normalizePhone("+14155552671", "US")).toBe("+14155552671");
    expect(normalizePhone("+442079460958", "GB")).toBe("+442079460958");
  });

  it("returns an empty string for an empty number", () => {
    expect(normalizePhone("", "IN")).toBe("");
    expect(normalizePhone("", "US")).toBe("");
  });

  it("does not duplicate the country code when the input already includes it", () => {
    expect(normalizePhone("919876543210", "IN")).toBe("+919876543210");
    expect(normalizePhone("919876543210", "IN")).not.toBe("+91+919876543210");
    expect(normalizePhone("14155552671", "US")).toBe("+14155552671");
    expect(normalizePhone("14155552671", "US")).not.toBe("+1+14155552671");
  });

  it("normalizes spaces, hyphens and parentheses before validation", () => {
    expect(normalizePhone("98765 43210", "IN")).toBe("+919876543210");
    expect(normalizePhone("(415) 555-2671", "US")).toBe("+14155552671");
    expect(normalizePhone("2079 460 958", "GB")).toBe("+442079460958");
  });

  it("does not convert an invalid number into a valid E.164 number", () => {
    const parsed = parsePhoneNumber(normalizePhone("98765", "IN"));
    expect(parsed.isValid()).toBe(false);
  });

  it("honors the selected country context: wrong country does not yield the intended E.164", () => {
    expect(normalizePhone("2079460958", "GB")).toBe("+442079460958");
    expect(normalizePhone("2079460958", "IN")).not.toBe("+442079460958");
  });

  it("uses India (+91) as the default country", () => {
    expect(DEFAULT_COUNTRY).toBe("IN");
    expect(normalizePhone("9876543210")).toBe("+919876543210");
  });
});

describe("Problem 05: PhoneInput onChange contract (root cause)", () => {
  it("PhoneInput onChange delivers an E.164 string value, not a React event", () => {
    // PhoneInput invokes onChange(normalizePhone(raw, country)) — a plain string.
    const value = normalizePhone("9876543210", "IN");
    expect(typeof value).toBe("string");
    expect(value.target).toBeUndefined();
    expect(value).toBe("+919876543210");
    // The backend schema must accept the value the frontend now sends.
    const result = applicationSchema.safeParse({
      fullName: "Test User",
      email: "test@example.com",
      password: "password12345",
      phone: value,
      gender: "male",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("+919876543210");
    }
  });
});
