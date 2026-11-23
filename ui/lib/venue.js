/**
 * Single source of truth for the official Mahotsav venue.
 *
 * The short link is the owner-supplied official reference. Directions use the
 * venue name and locality as the destination rather than passing the short URL
 * as a destination (Google Maps does not resolve a maps.app.goo.gl URL as a
 * place). No coordinates or Place ID are invented here: the short link has not
 * been resolved independently, so the name/locality is the honest fallback.
 */
export const OFFICIAL_VENUE = Object.freeze({
  name: "Kulti Golf Ground",
  locality: "Kulti, West Bengal",
  shortUrl: "https://maps.app.goo.gl/BcY87xSjA6iRtBY78",
  directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    "Kulti Golf Ground, Kulti, West Bengal",
  )}`,
});

export const VENUE_NAME = OFFICIAL_VENUE.name;
export const VENUE_LOCALITY = OFFICIAL_VENUE.locality;
export const VENUE_SHORT_URL = OFFICIAL_VENUE.shortUrl;
export const VENUE_DIRECTIONS_URL = OFFICIAL_VENUE.directionsUrl;
