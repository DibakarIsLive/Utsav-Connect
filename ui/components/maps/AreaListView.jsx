"use client";

import { useState } from "react";

export default function AreaListView({ areas = [], tree = [], onSelectArea, selectedAreaId }) {
  const [viewMode, setViewMode] = useState("table");
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");

  const types = Array.from(new Set(areas.map((a) => a.type || "Locality").filter(Boolean))).sort();

  const filteredAreas = areas.filter((area) => {
    const matchesSearch =
      !search ||
      area.name.toLowerCase().includes(search.toLowerCase()) ||
      (area.formattedAddress && area.formattedAddress.toLowerCase().includes(search.toLowerCase()));
    const matchesType = !selectedType || (area.type || "Locality") === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter areas by name..."
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-xs focus:border-brand-600 focus:outline-none sm:w-64"
          />
          {types.length > 0 && (
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-xs focus:border-brand-600 focus:outline-none"
            >
              <option value="">All Types ({areas.length})</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`rounded px-3 py-1 text-xs font-semibold ${
              viewMode === "table"
                ? "bg-brand-600 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Table ({filteredAreas.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("tree")}
            className={`rounded px-3 py-1 text-xs font-semibold ${
              viewMode === "tree"
                ? "bg-brand-600 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Hierarchy Tree
          </button>
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="overflow-x-auto">
          {filteredAreas.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No geographic areas found.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Area Name
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Parent Area
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Boundary
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAreas.map((area) => (
                  <tr
                    key={area._id}
                    onClick={() => onSelectArea?.(area)}
                    className={`cursor-pointer ${
                      selectedAreaId === area._id
                        ? "bg-brand-50/80 font-medium text-brand-950"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">{area.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{area.type || "Locality"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {area.parentId?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {area.boundary?.coordinates ? (
                        <span className="font-medium text-emerald-700">✓ Polygon</span>
                      ) : (
                        <span className="text-slate-400">Named Only</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectArea?.(area);
                        }}
                        className="rounded px-2.5 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="space-y-2 p-4 sm:p-6">
          {tree.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No areas defined yet.</div>
          ) : (
            tree.map((node) => (
              <TreeNode
                key={node._id}
                node={node}
                onSelectArea={onSelectArea}
                selectedAreaId={selectedAreaId}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TreeNode({ node, onSelectArea, selectedAreaId, depth = 0 }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedAreaId === node._id;

  return (
    <div className={`text-sm ${depth > 0 ? "ml-4 border-l border-slate-200 pl-2" : ""}`}>
      <div
        className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 ${
          isSelected
            ? "bg-brand-100 font-semibold text-brand-900"
            : "text-slate-800 hover:bg-slate-100"
        }`}
        onClick={() => onSelectArea?.(node)}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(!collapsed);
            }}
            className="flex h-5 w-5 items-center justify-center rounded text-xs text-slate-500 hover:bg-slate-200"
          >
            {collapsed ? "▶" : "▼"}
          </button>
        ) : (
          <span className="h-5 w-5 text-center text-xs text-slate-300">•</span>
        )}
        <span className="font-medium text-slate-900">{node.name}</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
          {node.type || "Area"}
        </span>
      </div>

      {!collapsed && hasChildren && (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => (
            <TreeNode
              key={child._id}
              node={child}
              onSelectArea={onSelectArea}
              selectedAreaId={selectedAreaId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
