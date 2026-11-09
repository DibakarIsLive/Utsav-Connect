"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SvgAtlas from "./SvgAtlas";
import Notice from "@/ui/components/ui/Notice";

const VENUE_URL = "https://maps.app.goo.gl/BcY87xSjA6iRtBY78";
const VENUE_DIRECTIONS = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
  VENUE_URL,
)}`;

function hasPoint(area) {
  const coordinates = area.location?.coordinates;
  return (
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    Number.isFinite(coordinates[0]) &&
    Number.isFinite(coordinates[1])
  );
}

function hasBoundary(area) {
  return area.boundary?.type === "Polygon" && Array.isArray(area.boundary.coordinates?.[0]);
}

/**
 * Optional live Google Maps layer. It is used only when a build-time API key
 * exists and at least one approved area has real recorded geometry. Without
 * that, the honest SVG atlas is shown instead of inventing a location.
 */
export default function GoogleMapCanvas({ areas = [], selectedId, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const mappable = useMemo(
    () => areas.filter((area) => hasPoint(area) || hasBoundary(area)),
    [areas],
  );

  const draw = useCallback(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();
    let hasGeometry = false;

    for (const area of mappable) {
      const selected = area._id === selectedId;

      if (hasBoundary(area)) {
        const path = area.boundary.coordinates[0].map(([lng, lat]) => ({ lat, lng }));
        const polygon = new window.google.maps.Polygon({
          paths: path,
          strokeColor: selected ? "#7c300c" : "#c04602",
          strokeWeight: selected ? 3 : 1.6,
          fillColor: selected ? "#e85b00" : "#e85b00",
          fillOpacity: selected ? 0.34 : 0.15,
          map,
          clickable: true,
        });
        polygon.addListener("click", () => onSelect?.(area._id));
        overlaysRef.current.push(polygon);
        path.forEach((point) => bounds.extend(point));
        hasGeometry = true;
      }

      if (hasPoint(area)) {
        const position = {
          lat: area.location.coordinates[1],
          lng: area.location.coordinates[0],
        };
        const marker = new window.google.maps.Marker({
          position,
          map,
          title: area.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: selected ? 9 : 6,
            fillColor: selected ? "#431806" : "#fff9ef",
            fillOpacity: 1,
            strokeColor: "#c04602",
            strokeWeight: selected ? 3 : 2,
          },
        });
        marker.addListener("click", () => onSelect?.(area._id));
        overlaysRef.current.push(marker);
        bounds.extend(position);
        hasGeometry = true;
      }
    }

    if (hasGeometry) map.fitBounds(bounds, 64);
  }, [mappable, selectedId, onSelect]);

  useEffect(() => {
    if (!apiKey || mappable.length === 0) {
      setStatus("fallback");
      return;
    }

    if (window.google?.maps) {
      setStatus("ready");
      return;
    }

    const existing = document.getElementById("google-maps-js-sdk");
    if (existing) {
      existing.addEventListener("load", () => setStatus("ready"));
      existing.addEventListener("error", () => setStatus("error"));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-js-sdk";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => setStatus("ready");
    script.onerror = () => {
      setError("The live Google Maps layer could not be loaded.");
      setStatus("error");
    };
    document.head.appendChild(script);
  }, [apiKey, mappable.length]);

  useEffect(() => {
    if (status !== "ready" || !containerRef.current) return;

    if (!mapRef.current) {
      // Start from real stored geometry. If none exists the atlas fallback is
      // shown instead, so this viewport is never an invented campaign location.
      const point = mappable.find(hasPoint)?.location?.coordinates;
      const ring = mappable.find(hasBoundary)?.boundary?.coordinates?.[0]?.[0];
      const first = point ?? ring;
      mapRef.current = new window.google.maps.Map(containerRef.current, {
        center: { lat: first?.[1] ?? 0, lng: first?.[0] ?? 0 },
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#f5eddf" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#5e372b" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#fff9ef" }] },
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#e7dccb" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#d7e3e0" }] },
        ],
      });
    }
    draw();
  }, [status, draw, mappable]);

  if (status === "fallback" || status === "error") {
    return (
      <div>
        {error ? (
          <Notice tone="warning" className="mb-3" title="Live map unavailable">
            {error} The approved-area atlas is shown instead.
          </Notice>
        ) : (
          <Notice tone="info" className="mb-3" title="Schematic atlas view">
            This build has no live Google Maps key, so the approved-area atlas is shown. Every
            position comes from recorded campaign geometry — none are invented.
          </Notice>
        )}
        <SvgAtlas areas={areas} selectedId={selectedId} onSelect={onSelect} />
      </div>
    );
  }

  return (
    <div className="border-line relative overflow-hidden rounded-2xl border bg-[#f3ead9]">
      <div ref={containerRef} className="h-[420px] w-full sm:h-[520px] lg:h-[600px]" />
      <div className="border-line/70 absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 border-t bg-white/90 px-4 py-2.5 text-[0.62rem] backdrop-blur">
        <span className="text-ink-500">
          Live Google Maps · approved geometry only · {mappable.length} plotted
        </span>
        <a
          href={VENUE_DIRECTIONS}
          target="_blank"
          rel="noopener noreferrer"
          className="text-saffron-700 hover:text-saffron-800 font-semibold"
        >
          Directions to the official venue
        </a>
      </div>
    </div>
  );
}
