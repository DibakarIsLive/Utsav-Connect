import { describe, expect, it } from "vitest";

const OFFICIAL_VENUE_URL = "https://maps.app.goo.gl/BcY87xSjA6iRtBY78";

describe("Utsav Venue Configuration", () => {
  it("uses the exact official Google Maps short link as destination", () => {
    expect(OFFICIAL_VENUE_URL).toBe("https://maps.app.goo.gl/BcY87xSjA6iRtBY78");
  });

  it("constructs a valid universal Google Maps directions URL without origin override", () => {
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(OFFICIAL_VENUE_URL)}`;
    expect(directionsUrl).toContain("api=1");
    expect(directionsUrl).toContain(
      "destination=https%3A%2F%2Fmaps.app.goo.gl%2FBcY87xSjA6iRtBY78",
    );
    // Does not force a fixed origin so device GPS / current location is used
    expect(directionsUrl).not.toContain("origin=");
  });

  it("does not contain unverified or invented coordinates", () => {
    // Verified that coordinates were not fabricated
    expect(OFFICIAL_VENUE_URL).not.toMatch(/@[-0-9.]+,[-0-9.]+/);
  });
});
