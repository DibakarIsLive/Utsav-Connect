import { describe, expect, it } from "vitest";
import {
  OFFICIAL_VENUE,
  VENUE_DIRECTIONS_URL,
  VENUE_LOCALITY,
  VENUE_NAME,
  VENUE_SHORT_URL,
} from "@/ui/lib/venue.js";

describe("official venue configuration", () => {
  it("keeps the owner-supplied short link as the canonical reference", () => {
    expect(VENUE_SHORT_URL).toBe("https://maps.app.goo.gl/BcY87xSjA6iRtBY78");
    expect(OFFICIAL_VENUE.shortUrl).toBe(VENUE_SHORT_URL);
  });

  it("identifies the venue by name and locality", () => {
    expect(VENUE_NAME).toBe("Kulti Golf Ground");
    expect(VENUE_LOCALITY).toBe("Kulti, West Bengal");
  });

  it("builds directions from the venue name, not the unresolvable short URL", () => {
    expect(VENUE_DIRECTIONS_URL).toContain("https://www.google.com/maps/dir/?api=1");
    expect(VENUE_DIRECTIONS_URL).toContain(
      `destination=${encodeURIComponent("Kulti Golf Ground, Kulti, West Bengal")}`,
    );
    expect(VENUE_DIRECTIONS_URL).not.toContain("maps.app.goo.gl");
    expect(VENUE_DIRECTIONS_URL).not.toContain("origin=");
  });

  it("does not invent coordinates or a Place ID for the venue", () => {
    const serialized = JSON.stringify(OFFICIAL_VENUE);
    expect(serialized).not.toMatch(/@-?\d+\.\d+,-?\d+\.\d+/);
    expect(serialized).not.toMatch(/place_id|placeId|coordinates/i);
  });
});
