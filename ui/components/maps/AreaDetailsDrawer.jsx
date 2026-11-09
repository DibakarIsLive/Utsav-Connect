"use client";

import Link from "next/link";

/**
 * Side panel / card displaying details for the currently selected geographic area.
 */
export default function AreaDetailsDrawer({ area, onClose, isAdmin = false }) {
  if (!area) return null;

  return (
    <div
      role="region"
      aria-label="Area details"
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6"
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
              {area.type || "Locality"}
            </span>
            {area.code && (
              <span className="font-mono text-xs text-slate-500 uppercase">{area.code}</span>
            )}
          </div>
          <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{area.name}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close details"
        >
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        {/* Hierarchy / Parent */}
        <div>
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Hierarchy
          </span>
          <p className="mt-0.5 font-medium text-slate-700">
            {area.parentId ? (
              <span>
                Part of <strong className="text-slate-900">{area.parentId.name}</strong>{" "}
                <span className="text-xs text-slate-500">({area.parentId.type || "Area"})</span>
              </span>
            ) : (
              <span className="text-slate-500">Top-level region / area</span>
            )}
          </p>
        </div>

        {/* Address */}
        {area.formattedAddress && (
          <div>
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Address / Landmarks
            </span>
            <p className="mt-0.5 text-slate-700">{area.formattedAddress}</p>
          </div>
        )}

        {/* Population */}
        <div>
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Estimated Population
          </span>
          <p className="mt-0.5 font-semibold text-slate-900">
            {area.populationEstimate > 0
              ? area.populationEstimate.toLocaleString()
              : "Not recorded"}
          </p>
        </div>

        {/* Coordinates */}
        {area.location?.coordinates && (
          <div>
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Center Coordinates
            </span>
            <p className="mt-0.5 font-mono text-xs text-slate-600">
              Lng: {area.location.coordinates[0].toFixed(5)}, Lat:{" "}
              {area.location.coordinates[1].toFixed(5)}
            </p>
          </div>
        )}

        {/* Boundary status */}
        <div>
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Boundary
          </span>
          <p className="mt-0.5 text-xs text-slate-600">
            {area.boundary?.coordinates
              ? `GeoJSON ${area.boundary.type} boundary mapped`
              : "No polygon boundary drawn (point or name only)"}
          </p>
        </div>

        {/* Notes */}
        {area.notes && (
          <div>
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Notes
            </span>
            <p className="mt-0.5 text-xs text-slate-600 italic">{area.notes}</p>
          </div>
        )}

        {/* Children summary */}
        {area.children && area.children.length > 0 && (
          <div className="border-t border-slate-100 pt-2">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Child Areas ({area.children.length})
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {area.children.map((child) => (
                <span
                  key={child._id}
                  className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                >
                  {child.name} <span className="text-slate-400">({child.type || "Area"})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="mt-6 flex gap-2 border-t border-slate-100 pt-4">
          <Link
            href={`/admin/areas?edit=${area._id}`}
            className="w-full rounded-md bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-800 hover:bg-slate-200"
          >
            Manage Area in Admin →
          </Link>
        </div>
      )}
    </div>
  );
}
