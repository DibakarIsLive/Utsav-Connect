"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminPageHeader from "@/ui/components/admin/AdminPageHeader";
import CreateAreaModal from "@/ui/components/admin/CreateAreaModal";
import Badge, { StatusBadge } from "@/ui/components/ui/Badge";
import Notice from "@/ui/components/ui/Notice";
import EmptyState from "@/ui/components/ui/EmptyState";
import Skeleton from "@/ui/components/ui/Skeleton";
import { Button, ArrowRight } from "@/ui/components/ui/Button";
import { ConfirmDialog } from "@/ui/components/ui/Modal";
import { apiFetch } from "@/ui/lib/api-client";
import { formatDate, formatNumber } from "@/ui/lib/format";

export default function AdminAreasClient({ initialFocus = "" }) {
  const [areas, setAreas] = useState([]);
  const [allAreas, setAllAreas] = useState([]);
  const [state, setState] = useState({ status: "loading", error: null });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadAll = useCallback(async () => {
    try {
      const data = await apiFetch("/api/admin/areas");
      setAllAreas(data?.areas ?? []);
    } catch {
      // The visible list already reports the error; parent options simply stay
      // limited to what is available.
    }
  }, []);

  const load = useCallback(async () => {
    setState({ status: "loading", error: null });
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const data = await apiFetch(`/api/admin/areas?${params.toString()}`);
      setAreas(data?.areas ?? []);
      setState({ status: "ready", error: null });
    } catch (error) {
      setState({ status: "error", error: error.message });
    }
  }, [search, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!initialFocus) return;
    const match = allAreas.find((area) => String(area._id) === initialFocus);
    if (match) {
      setEditingArea(match);
      setModalOpen(true);
    }
  }, [initialFocus, allAreas]);

  const counts = useMemo(() => {
    const approved = allAreas.filter((area) => area.status === "approved").length;
    return { total: allAreas.length, approved, archived: allAreas.length - approved };
  }, [allAreas]);

  const approvedWithoutGeometry = useMemo(
    () =>
      allAreas.filter(
        (area) =>
          area.status === "approved" && !area.location?.coordinates && !area.boundary?.coordinates,
      ).length,
    [allAreas],
  );

  function openCreate() {
    setEditingArea(null);
    setModalOpen(true);
    setNotice(null);
  }

  function openEdit(area) {
    setEditingArea(area);
    setModalOpen(true);
    setNotice(null);
  }

  async function handleArchive() {
    if (!archiveTarget) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await apiFetch(`/api/admin/areas/${archiveTarget._id}`, { method: "DELETE" });
      setNotice({
        tone: "success",
        title: "Area archived",
        body: `${archiveTarget.name} is hidden from the public map. Its report history is preserved.`,
      });
      setArchiveTarget(null);
      await Promise.all([load(), loadAll()]);
    } catch (error) {
      setActionError(error.message);
      setArchiveTarget(null);
    } finally {
      setActionBusy(false);
    }
  }

  async function restoreArea(area) {
    setActionBusy(true);
    setActionError(null);
    try {
      await apiFetch(`/api/admin/areas/${area._id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "approved" }),
      });
      setNotice({
        tone: "success",
        title: "Area restored",
        body: `${area.name} is approved and publicly visible again.`,
      });
      await Promise.all([load(), loadAll()]);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Campaign geography"
        title="Official areas, kept deliberately."
        description="Create the approved places the outreach can report against, keep the hierarchy honest, and archive mistakes without erasing history."
        actions={
          <Button onClick={openCreate}>Create area</Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Approved areas", value: counts.approved, tone: "green" },
          { label: "Archived areas", value: counts.archived, tone: "neutral" },
          { label: "Without geometry", value: approvedWithoutGeometry, tone: "amber" },
        ].map((item) => (
          <div key={item.label} className="admin-card px-5 py-4">
            <Badge tone={item.tone}>{item.label}</Badge>
            <p className="font-display text-bark-900 mt-2.5 text-2xl font-semibold tabular-nums">
              {formatNumber(item.value)}
            </p>
          </div>
        ))}
      </div>

      {notice ? (
        <Notice tone={notice.tone} className="mb-4" title={notice.title}>
          {notice.body}
        </Notice>
      ) : null}
      {actionError ? (
        <Notice tone="error" className="mb-4" title="Action not completed">
          {actionError}
        </Notice>
      ) : null}
      {approvedWithoutGeometry > 0 ? (
        <Notice tone="info" className="mb-4" title="Some approved areas have no recorded geometry">
          {approvedWithoutGeometry} approved{" "}
          {approvedWithoutGeometry === 1 ? "area is" : "areas are"} listed publicly but will not be
          plotted on the atlas. Add verified coordinates or a boundary when they are available; never
          guess a location.
        </Notice>
      ) : null}

      <div className="border-line shadow-soft rounded-2xl border bg-white">
        <div className="border-line flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1 sm:max-w-sm">
              <label htmlFor="areaAdminSearch" className="sr-only">
                Search areas
              </label>
              <input
                id="areaAdminSearch"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search name, code, or address…"
                className="input-base !py-2.5 text-[0.82rem]"
              />
            </div>
            <div>
              <label htmlFor="areaAdminStatus" className="sr-only">
                Filter by area status
              </label>
              <select
                id="areaAdminStatus"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="input-base !w-auto !py-2.5 text-[0.82rem]"
              >
                <option value="">All statuses</option>
                <option value="approved">Approved</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(search || status || searchInput) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setStatus("");
                }}
              >
                Clear filters
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={load} disabled={state.status === "loading"}>
              {state.status === "loading" ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </div>

        {state.status === "error" ? (
          <div className="p-4">
            <Notice tone="error" title="Areas could not be loaded">
              {state.error}
              <button
                type="button"
                onClick={load}
                className="mt-2 block font-semibold underline underline-offset-2"
              >
                Try again
              </button>
            </Notice>
          </div>
        ) : null}

        {state.status === "loading" ? (
          <div className="space-y-3 p-4 sm:p-5" aria-busy="true">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
            <span className="sr-only">Loading areas…</span>
          </div>
        ) : null}

        {state.status === "ready" && areas.length === 0 ? (
          <EmptyState
            icon="map"
            title={search || status ? "No area matches these filters" : "No official areas yet"}
            description={
              search || status
                ? "Try a different name, code, address or status."
                : "Create the first approved locality so devotees have a place to record invitations. Pending proposals stay separate until reviewed."
            }
            action={
              search || status ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setStatus("");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button onClick={openCreate}>Create the first area</Button>
              )
            }
          />
        ) : null}

        {state.status === "ready" && areas.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-cream/60 text-ink-400 border-line border-b text-[0.6rem] font-bold tracking-[0.12em] uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 sm:px-5">
                      Area
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      Parent
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right">
                      Population
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      Geometry
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right sm:px-5">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-line divide-y">
                  {areas.map((area) => {
                    const parentName =
                      typeof area.parentId === "object" && area.parentId ? area.parentId.name : null;
                    return (
                      <tr key={area._id} className="hover:bg-cream/40 transition-colors">
                        <td className="px-4 py-3.5 sm:px-5">
                          <p className="text-bark-900 text-sm font-semibold">{area.name}</p>
                          <p className="text-ink-400 mt-0.5 text-[0.68rem]">
                            {area.type || "Locality"}
                            {area.code ? ` · ${area.code}` : ""}
                            {area.createdAt ? ` · ${formatDate(area.createdAt)}` : ""}
                          </p>
                        </td>
                        <td className="text-ink-600 px-4 py-3.5 text-[0.78rem]">
                          {parentName ?? "Top level"}
                        </td>
                        <td className="text-ink-600 px-4 py-3.5 text-right text-[0.78rem] tabular-nums">
                          {Number(area.populationEstimate) > 0
                            ? formatNumber(area.populationEstimate)
                            : "Unrecorded"}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-ink-500 text-[0.72rem]">
                            {area.boundary?.coordinates
                              ? "Boundary"
                              : area.location?.coordinates
                                ? "Point"
                                : "None"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={area.status} />
                        </td>
                        <td className="px-4 py-3.5 sm:px-5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(area)}
                              className="text-saffron-700 hover:text-saffron-800 text-[0.72rem] font-semibold"
                            >
                              Edit
                            </button>
                            {area.status === "approved" ? (
                              <button
                                type="button"
                                onClick={() => setArchiveTarget(area)}
                                className="text-ink-400 hover:text-red-700 text-[0.72rem] font-semibold"
                              >
                                Archive
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => restoreArea(area)}
                                disabled={actionBusy}
                                className="text-ink-400 hover:text-emerald-700 text-[0.72rem] font-semibold"
                              >
                                Restore
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-line divide-y lg:hidden">
              {areas.map((area) => {
                const parentName =
                  typeof area.parentId === "object" && area.parentId ? area.parentId.name : null;
                return (
                  <li key={area._id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-bark-900 truncate text-sm font-semibold">{area.name}</p>
                        <p className="text-ink-400 mt-0.5 text-[0.68rem]">
                          {area.type || "Locality"}
                          {parentName ? ` · ${parentName}` : ""}
                          {area.code ? ` · ${area.code}` : ""}
                        </p>
                        <p className="text-ink-400 mt-1 text-[0.66rem]">
                          {Number(area.populationEstimate) > 0
                            ? `${formatNumber(area.populationEstimate)} people`
                            : "Population unrecorded"}{" "}
                          ·{" "}
                          {area.boundary?.coordinates
                            ? "boundary recorded"
                            : area.location?.coordinates
                              ? "point recorded"
                              : "no geometry"}
                        </p>
                      </div>
                      <StatusBadge status={area.status} />
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(area)}>
                        Edit
                      </Button>
                      {area.status === "approved" ? (
                        <button
                          type="button"
                          onClick={() => setArchiveTarget(area)}
                          className="text-ink-400 hover:text-red-700 text-[0.72rem] font-semibold"
                        >
                          Archive
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => restoreArea(area)}
                          disabled={actionBusy}
                          className="text-ink-400 hover:text-emerald-700 text-[0.72rem] font-semibold"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-400 text-[0.72rem] leading-relaxed">
          Reports are tied to these official records. Archiving hides an area but never deletes it or
          its reporting history.
        </p>
        <Link
          href="/admin/proposals"
          className="text-saffron-700 hover:text-saffron-800 inline-flex items-center gap-1.5 text-[0.76rem] font-semibold"
        >
          Review locality proposals <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <CreateAreaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        existingArea={editingArea}
        allAreas={allAreas}
        onSaved={() => {
          load();
          loadAll();
        }}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        loading={actionBusy}
        destructive
        title="Archive this area?"
        description="It will be hidden from the public map and directory. Reports and the record itself are preserved; this is a soft archive, not a deletion."
        confirmLabel="Archive area"
      >
        {archiveTarget ? (
          <p className="text-ink-600 text-sm">
            <strong className="text-bark-900">{archiveTarget.name}</strong>
            {archiveTarget.code ? ` (${archiveTarget.code})` : ""}
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
