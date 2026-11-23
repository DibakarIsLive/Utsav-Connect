import { describe, expect, it } from "vitest";
import {
  assertE2eDatabaseUri,
  databaseNameFromUri,
  E2E_ALLOWED_DB,
} from "../../scripts/lib/e2e-db-guard.js";

const uriFor = (name) => `mongodb+srv://user:secret@cluster.example.test/${name}?retryWrites=true`;

describe("E2E database safety guard", () => {
  it("accepts only the permitted test database", () => {
    expect(assertE2eDatabaseUri(uriFor(E2E_ALLOWED_DB))).toBe(E2E_ALLOWED_DB);
  });

  it("rejects the pilot database", () => {
    expect(() => assertE2eDatabaseUri(uriFor("utsav_connect_pilot"))).toThrow(/pilot/i);
  });

  it("rejects an unexpected database name", () => {
    expect(() => assertE2eDatabaseUri(uriFor("some_other_database"))).toThrow(/not the permitted/i);
  });

  it("rejects a URI with no database name", () => {
    expect(() => assertE2eDatabaseUri("mongodb://127.0.0.1:27017")).toThrow(/no database name/i);
  });

  it("does not include credentials in error messages", () => {
    try {
      assertE2eDatabaseUri(uriFor("utsav_connect_pilot"));
      throw new Error("expected a rejection");
    } catch (error) {
      expect(error.message).not.toContain("secret");
      expect(error.message).not.toContain("user:");
    }
  });

  it("parses database names with and without options", () => {
    expect(databaseNameFromUri("mongodb://127.0.0.1:27019/utsav_connect_test")).toBe(
      "utsav_connect_test",
    );
    expect(databaseNameFromUri(uriFor("utsav_connect_test"))).toBe("utsav_connect_test");
  });
});
