"use client";

import StatusNotice from "@/ui/components/ui/StatusNotice";

const VENUE_SHORT_URL = "https://maps.app.goo.gl/BcY87xSjA6iRtBY78";
const VENUE_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(VENUE_SHORT_URL)}`;

export default function MapFallbackViewer({ areas = [], onSelectArea, selectedArea, errorMsg }) {
  return (
    <div className="p-6">
      <StatusNotice
        variant="info"
        title="Interactive Area Map Active (Google Maps API Key Optional)"
      >
        {errorMsg ||
          "Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local to enable live Google satellite tiles and Places autocompletion. All approved campaign areas and boundaries are fully interactive below:"}
      </StatusNotice>

      <div className="mt-4 flex min-h-[380px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <span className="text-3xl">🗺️</span>
        <h4 className="mt-2 text-base font-bold text-slate-800">
          {areas.length} Approved Areas in Campaign
        </h4>
        <p className="mt-1 max-w-md text-xs text-slate-500">
          All geographic areas, parent hierarchies, and GeoJSON boundaries are stored in MongoDB.
          Select any area below to inspect its details:
        </p>

        <div className="mt-4 flex max-w-lg flex-wrap justify-center gap-2">
          {areas.map((a) => {
            const isSelected = selectedArea?._id === a._id;
            return (
              <button
                key={a._id}
                type="button"
                onClick={() => onSelectArea?.(a)}
                className={`rounded-full px-3 py-1 text-xs font-medium shadow-xs transition-colors ${
                  isSelected
                    ? "bg-brand-600 font-semibold text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-brand-500 hover:text-brand-700"
                }`}
              >
                {a.name} <span className="text-[10px] opacity-70">({a.type || "Area"})</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4">
          <a
            href={VENUE_DIRECTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline"
          >
            📍 Open Directions to Central Venue in Google Maps →
          </a>
        </div>
      </div>
    </div>
  );
}
