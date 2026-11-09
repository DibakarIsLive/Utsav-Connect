"use client";

import { useMemo, useState } from "react";
import { cn } from "@/ui/lib/cn";

const WIDTH = 1000;
const HEIGHT = 620;

function validPoint(coordinate) {
  return (
    Array.isArray(coordinate) &&
    coordinate.length >= 2 &&
    Number.isFinite(coordinate[0]) &&
    Number.isFinite(coordinate[1]) &&
    coordinate[0] >= -180 &&
    coordinate[0] <= 180 &&
    coordinate[1] >= -90 &&
    coordinate[1] <= 90
  );
}

/**
 * Extract only the geometry that actually exists in the database. Nothing is
 * placed on the fallback atlas by guessing a location.
 */
function geometryOf(area) {
  const rings = [];
  const points = [];

  const boundary = area.boundary;
  if (boundary?.type === "Polygon" && Array.isArray(boundary.coordinates?.[0])) {
    const ring = boundary.coordinates[0].filter(validPoint);
    if (ring.length >= 3) {
      rings.push(ring);
      points.push(...ring);
    }
  } else if (boundary?.type === "MultiPolygon" && Array.isArray(boundary.coordinates)) {
    for (const polygon of boundary.coordinates) {
      const ring = Array.isArray(polygon?.[0]) ? polygon[0].filter(validPoint) : [];
      if (ring.length >= 3) {
        rings.push(ring);
        points.push(...ring);
      }
    }
  }

  if (validPoint(area.location?.coordinates)) {
    points.push(area.location.coordinates);
  }

  if (points.length === 0) return null;

  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);
  const centroid = {
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
  };

  return { rings, points, centroid };
}

export default function SvgAtlas({ areas = [], selectedId, onSelect }) {
  const [zoom, setZoom] = useState(1);

  const plotted = useMemo(
    () =>
      areas
        .map((area) => ({ area, geometry: geometryOf(area) }))
        .filter((entry) => entry.geometry),
    [areas],
  );

  const missingGeometry = areas.length - plotted.length;

  const projection = useMemo(() => {
    if (plotted.length === 0) return null;
    const allPoints = plotted.flatMap((entry) => entry.geometry.points);
    const lngs = allPoints.map(([lng]) => lng);
    const lats = allPoints.map(([, lat]) => lat);
    let minLng = Math.min(...lngs);
    let maxLng = Math.max(...lngs);
    let minLat = Math.min(...lats);
    let maxLat = Math.max(...lats);

    let spanLng = maxLng - minLng;
    let spanLat = maxLat - minLat;
    if (spanLng < 0.004) {
      minLng -= 0.008;
      maxLng += 0.008;
      spanLng = maxLng - minLng;
    }
    if (spanLat < 0.004) {
      minLat -= 0.008;
      maxLat += 0.008;
      spanLat = maxLat - minLat;
    }

    const padX = spanLng * 0.1;
    const padY = spanLat * 0.12;
    minLng -= padX;
    maxLng += padX;
    minLat -= padY;
    maxLat += padY;
    spanLng = maxLng - minLng;
    spanLat = maxLat - minLat;

    const project = ([lng, lat]) => ({
      x: ((lng - minLng) / spanLng) * WIDTH,
      y: ((maxLat - lat) / spanLat) * HEIGHT,
    });

    const projected = new Map();
    for (const entry of plotted) {
      const points = entry.geometry.points.map(project);
      const rings = entry.geometry.rings.map((ring) => ring.map(project));
      const center = project([entry.geometry.centroid.lng, entry.geometry.centroid.lat]);
      projected.set(entry.area._id, { points, rings, center });
    }

    return { projected };
  }, [plotted]);

  const selectedEntry =
    selectedId && projection ? projection.projected.get(selectedId) : null;
  const center = selectedEntry?.center ?? { x: WIDTH / 2, y: HEIGHT / 2 };
  const viewWidth = WIDTH / zoom;
  const viewHeight = HEIGHT / zoom;
  const viewX = Math.max(0, Math.min(WIDTH - viewWidth, center.x - viewWidth / 2));
  const viewY = Math.max(0, Math.min(HEIGHT - viewHeight, center.y - viewHeight / 2));

  function handleKey(event, areaId) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect?.(areaId);
    }
  }

  return (
    <div className="relative">
      <div className="border-line relative overflow-hidden rounded-2xl border bg-[#f3ead9]">
        <div className="absolute inset-0 opacity-[0.55]">
          <div className="pattern-contour h-full w-full" aria-hidden="true" />
        </div>

        <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
          <span className="border-line/80 text-ink-500 rounded-full border bg-white/85 px-3 py-1.5 text-[0.62rem] font-bold tracking-[0.1em] uppercase shadow-sm backdrop-blur">
            Approved areas only
          </span>
        </div>

        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-xl border border-line/80 bg-white/90 p-1 shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={() => setZoom((value) => Math.min(3, value + 0.5))}
            disabled={zoom >= 3}
            aria-label="Zoom in on atlas"
            className="text-ink-600 hover:bg-cream hover:text-bark-900 flex h-8 w-8 items-center justify-center rounded-lg text-lg font-semibold transition-colors disabled:opacity-35"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom((value) => Math.max(1, value - 0.5))}
            disabled={zoom <= 1}
            aria-label="Zoom out of atlas"
            className="text-ink-600 hover:bg-cream hover:text-bark-900 flex h-8 w-8 items-center justify-center rounded-lg text-lg font-semibold transition-colors disabled:opacity-35"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="text-ink-500 hover:bg-cream hover:text-bark-900 border-line ml-0.5 rounded-lg border px-2.5 text-[0.62rem] font-bold tracking-[0.08em] uppercase transition-colors"
          >
            Fit
          </button>
          <span className="text-ink-400 px-1.5 text-[0.62rem] font-semibold tabular-nums">
            {zoom.toFixed(1)}×
          </span>
        </div>

        {plotted.length === 0 ? (
          <div className="relative flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center sm:min-h-[520px]">
            <span className="bg-saffron-50 text-saffron-700 flex h-12 w-12 items-center justify-center rounded-2xl">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
                <path
                  d="M9 3 3.8 5.1v15.4L9 18.4l6 2.1 5.2-2.1V3.1L15 5.2 9 3Zm0 0v15.4m6-13.2v15.3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <h3 className="text-bark-900 font-display mt-5 text-xl font-semibold">
              Coordinates have not been recorded yet
            </h3>
            <p className="text-ink-500 mt-2 max-w-sm text-sm leading-relaxed">
              Approved localities appear in the directory even when no boundary or point is
              available. The atlas never invents a position to fill the gap.
            </p>
          </div>
        ) : (
          <svg
            viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`}
            role="img"
            aria-label={`Atlas of ${plotted.length} approved localities with recorded coordinates`}
            className="relative block h-[420px] w-full sm:h-[520px] lg:h-[600px]"
          >
            <defs>
              <pattern id="atlas-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M50 0H0V50" fill="none" stroke="#d8c6aa" strokeWidth="0.6" opacity="0.55" />
              </pattern>
              <linearGradient id="atlas-selected-fill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#e85b00" stopOpacity="0.3" />
                <stop offset="1" stopColor="#d99a38" stopOpacity="0.18" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="url(#atlas-grid)" />
            <path
              d="M-30 470c130-90 230-100 360-40s240 60 360-20 190-60 340-10"
              fill="none"
              stroke="#cbb492"
              strokeWidth="1.2"
              opacity="0.5"
            />
            <path
              d="M-30 510c130-90 230-100 360-40s240 60 360-20 190-60 340-10"
              fill="none"
              stroke="#cbb492"
              strokeWidth="0.8"
              opacity="0.32"
            />

            {plotted.map(({ area }) => {
              const shape = projection.projected.get(area._id);
              if (!shape) return null;
              const selected = area._id === selectedId;
              const hasPolygon = shape.rings.length > 0;
              return (
                <g
                  key={area._id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${area.name}, ${area.type || "locality"}${
                    selected ? ", selected" : ""
                  }`}
                  aria-pressed={selected}
                  onClick={() => onSelect?.(area._id)}
                  onKeyDown={(event) => handleKey(event, area._id)}
                  className="cursor-pointer outline-none"
                >
                  {hasPolygon ? (
                    shape.rings.map((ring, index) => (
                      <polygon
                        key={index}
                        points={ring.map((point) => `${point.x},${point.y}`).join(" ")}
                        fill={selected ? "url(#atlas-selected-fill)" : "#e85b00"}
                        fillOpacity={selected ? 1 : 0.14}
                        stroke={selected ? "#9a3d06" : "#c04602"}
                        strokeWidth={selected ? 2.4 : 1.4}
                        strokeDasharray={selected ? undefined : "5 3"}
                        className="transition-all duration-300"
                      />
                    ))
                  ) : null}

                  <circle
                    cx={shape.center.x}
                    cy={shape.center.y}
                    r={selected ? 10 : 6}
                    fill={selected ? "#c04602" : "#fff9ef"}
                    stroke={selected ? "#fff9ef" : "#c04602"}
                    strokeWidth={selected ? 3 : 2}
                    className="transition-all duration-300"
                  />
                  {selected ? (
                    <circle
                      cx={shape.center.x}
                      cy={shape.center.y}
                      r="17"
                      fill="none"
                      stroke="#c04602"
                      strokeWidth="1.3"
                      strokeDasharray="3 3"
                      opacity="0.7"
                    />
                  ) : null}

                  {(selected || plotted.length <= 18) && (
                    <text
                      x={shape.center.x}
                      y={shape.center.y + (selected ? 29 : 22)}
                      textAnchor="middle"
                      fill="#431806"
                      stroke="#f3ead9"
                      strokeWidth="3"
                      paintOrder="stroke"
                      fontSize={selected ? 14 : 11.5}
                      fontWeight={selected ? 700 : 600}
                      className="pointer-events-none select-none"
                    >
                      {area.name.length > 26 ? `${area.name.slice(0, 25)}…` : area.name}
                    </text>
                  )}
                  <title>
                    {`${area.name}${area.code ? ` (${area.code})` : ""} — ${
                      area.type || "Locality"
                    }`}
                  </title>
                </g>
              );
            })}
          </svg>
        )}

        <div className="border-line/70 text-ink-500 relative flex flex-wrap items-center justify-between gap-2 border-t bg-white/70 px-4 py-2.5 text-[0.62rem] backdrop-blur">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="border-saffron-700 bg-saffron-600/15 h-2.5 w-4 rounded-sm border" />
              Recorded boundary
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="border-saffron-700 h-2.5 w-2.5 rounded-full border-2 bg-white" />
              Recorded point
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="bg-bark-900 h-2.5 w-2.5 rounded-full" />
              Selected
            </span>
          </div>
          <span className="text-ink-400">Schematic atlas, not a survey map</span>
        </div>
      </div>

      {missingGeometry > 0 ? (
        <p className="text-ink-400 mt-3 text-[0.72rem] leading-relaxed">
          {missingGeometry} approved {missingGeometry === 1 ? "locality has" : "localities have"} no
          recorded coordinates yet. They remain available in the directory and are never placed by
          guesswork.
        </p>
      ) : null}

      <p className="text-ink-400 mt-2 text-[0.68rem] leading-relaxed">
        Atlas positions come only from stored GeoJSON points and boundaries. Panning is not enabled;
        use the zoom controls to inspect overlapping areas.
      </p>
    </div>
  );
}
