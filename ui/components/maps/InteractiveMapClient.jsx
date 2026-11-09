"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import GoogleMapCanvas from "./GoogleMapCanvas";
import AreaDetailsDrawer from "./AreaDetailsDrawer";
import AreaListView from "./AreaListView";
import ProposeAreaModal from "./ProposeAreaModal";

export default function InteractiveMapClient({ initialAreas = [], initialTree = [] }) {
  const [areas, setAreas] = useState(initialAreas);
  const [tree, setTree] = useState(initialTree);
  const [selectedArea, setSelectedArea] = useState(null);
  const [activeTab, setActiveTab] = useState("map"); // "map" | "list"
  const [modalOpen, setModalOpen] = useState(false);
  const [user, setUser] = useState(null);

  // Load user session
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.data?.user) setUser(d.data.user);
      })
      .catch(() => {});
  }, []);

  // Fetch areas if not provided initially
  useEffect(() => {
    if (initialAreas.length === 0) {
      fetch("/api/areas")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.data?.areas) setAreas(d.data.areas);
        })
        .catch(() => {});
      fetch("/api/areas?format=tree")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.data?.areas) setTree(d.data.areas);
        })
        .catch(() => {});
    }
  }, [initialAreas.length]);

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const canPropose = user && (user.status === "active" || isAdmin);

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* View Switcher: Interactive Map vs Non-Map List */}
        <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("map")}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "map"
                ? "bg-white text-brand-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🗺️ Interactive Map
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "list"
                ? "bg-white text-brand-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📋 Non-Map View & Hierarchy
          </button>
        </div>

        {/* Action Buttons: Propose Locality & Admin Management */}
        <div className="flex flex-wrap items-center gap-2">
          {canPropose && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-md bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-700"
            >
              + Propose Locality
            </button>
          )}

          {isAdmin && (
            <Link
              href="/admin/areas"
              className="rounded-md border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
            >
              ⚙️ Manage Areas
            </Link>
          )}

          {!user && (
            <Link
              href="/apply"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Join to Propose Areas
            </Link>
          )}
        </div>
      </div>

      {/* Main Map or List Interface */}
      {activeTab === "map" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className={selectedArea ? "lg:col-span-2" : "lg:col-span-3"}>
            <GoogleMapCanvas
              areas={areas}
              selectedArea={selectedArea}
              onSelectArea={(area) => setSelectedArea(area)}
            />
          </div>

          {selectedArea && (
            <div className="lg:col-span-1">
              <AreaDetailsDrawer
                area={selectedArea}
                isAdmin={isAdmin}
                onClose={() => setSelectedArea(null)}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className={selectedArea ? "lg:col-span-2" : "lg:col-span-3"}>
            <AreaListView
              areas={areas}
              tree={tree}
              selectedAreaId={selectedArea?._id}
              onSelectArea={(area) => setSelectedArea(area)}
            />
          </div>

          {selectedArea && (
            <div className="lg:col-span-1">
              <AreaDetailsDrawer
                area={selectedArea}
                isAdmin={isAdmin}
                onClose={() => setSelectedArea(null)}
              />
            </div>
          )}
        </div>
      )}

      {/* Proposal Modal */}
      <ProposeAreaModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        parentAreas={areas}
        onProposed={() => {
          loadAreas();
        }}
      />
    </div>
  );
}
