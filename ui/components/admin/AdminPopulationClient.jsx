"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPageHeader from "@/ui/components/admin/AdminPageHeader";
import Notice from "@/ui/components/ui/Notice";
import EmptyState from "@/ui/components/ui/EmptyState";
import Skeleton from "@/ui/components/ui/Skeleton";
import Badge from "@/ui/components/ui/Badge";
import { Button } from "@/ui/components/ui/Button";
import { TextInput } from "@/ui/components/ui/Field";
import { apiFetch } from "@/ui/lib/api-client";
import { formatNumber } from "@/ui/lib/format";

export default function AdminPopulationClient() {
  const [areas, setAreas] = useState([]);
  const [state, setState] = useState({ status: "loading", error: null });
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [value, setValue] = useState("");
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    setState({ status: "loading", error: null });
    try {
      const data = await apiFetch("/api/admin/areas?status=approved");
      setAreas(data?.areas ?? []);
      setState({ status: "ready", error: null });
    } catch (error) {
      setState({ status: "error", error: error.message });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = areas.filter((area) =>
    area.name?.toLowerCase().includes(search.trim().toLowerCase()),
  );

  function startEdit(area) {
    setEditing(area._id ?? area.id);
    setValue(area.populationEstimate > 0 ? String(area.populationEstimate) : "");
    setFormError(null);
    setMessage(null);
  }

  async function save(area) {
    setFormError(null);
    setMessage(null);
    if (value === "") {
      setFormError("Enter a population estimate or leave the area unchanged.");
      return;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setFormError("Population must be a non-negative whole number.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/admin/areas/${area._id ?? area.id}`, {
        method: "PATCH",
        body: JSON.stringify({ populationEstimate: parsed }),
      });
      setMessage(`${area.name} now has a population estimate of ${formatNumber(parsed)}.`);
      setEditing(null);
      await load();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Campaign geography"
        title="Population estimates."
        description="Population belongs to approved areas and directly affects reported invitation coverage. Unrecorded estimates stay unavailable — they are never treated as zero. Changes are written to the audit log."
        actions={<Badge tone="neutral">{areas.length} approved areas</Badge>}
      />
      <div className="rounded-2xl border border-line bg-white shadow-soft">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search approved areas…"
            aria-label="Search approved areas"
            className="input-base !py-2.5 text-[0.82rem] sm:max-w-sm"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={load}
            disabled={state.status === "loading"}
          >
            Refresh
          </Button>
        </div>

        {message ? (
          <div className="p-4 pt-0">
            <Notice tone="success" title="Population updated">
              {message}
            </Notice>
          </div>
        ) : null}
        {state.status === "error" ? (
          <div className="p-4">
            <Notice tone="error" title="Population data unavailable">
              {state.error}
            </Notice>
          </div>
        ) : null}
        {state.status === "loading" ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : null}
        {state.status === "ready" && filtered.length === 0 ? (
          <EmptyState
            icon="map"
            className="border-0 shadow-none"
            title="No approved areas"
            description="Population can only be recorded for approved areas."
          />
        ) : null}

        {state.status === "ready" && filtered.length > 0 ? (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-cream/60 text-[0.6rem] font-bold tracking-[0.12em] text-ink-400 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-2.5 sm:px-5">
                    Area
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Population estimate
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right sm:px-5">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((area) => (
                  <tr key={area._id ?? area.id}>
                    <td className="px-4 py-3.5 font-semibold text-bark-900 sm:px-5">{area.name}</td>
                    <td className="px-4 py-3.5 text-[0.78rem] text-ink-600">
                      {area.type || "Locality"}
                    </td>
                    <td className="px-4 py-3.5 text-[0.82rem] text-ink-600">
                      {editing === (area._id ?? area.id) ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <TextInput
                            type="number"
                            min="0"
                            step="1"
                            value={value}
                            onChange={(event) => setValue(event.target.value)}
                            aria-label={`Population estimate for ${area.name}`}
                            className="!w-40"
                          />
                          <Button size="sm" onClick={() => save(area)} disabled={saving}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditing(null)}
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : Number(area.populationEstimate) > 0 ? (
                        formatNumber(area.populationEstimate)
                      ) : (
                        <Badge tone="neutral">Unavailable</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right sm:px-5">
                      {editing !== (area._id ?? area.id) ? (
                        <Button size="sm" variant="secondary" onClick={() => startEdit(area)}>
                          Edit
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {state.status === "ready" && filtered.length > 0 ? (
          <ul className="divide-y divide-line md:hidden">
            {filtered.map((area) => (
              <li key={area._id ?? area.id} className="px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-bark-900">{area.name}</p>
                    <p className="text-[0.72rem] text-ink-400">
                      {Number(area.populationEstimate) > 0
                        ? `${formatNumber(area.populationEstimate)} people`
                        : "Population unavailable"}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => startEdit(area)}>
                    Edit
                  </Button>
                </div>
                {editing === (area._id ?? area.id) ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <TextInput
                      type="number"
                      min="0"
                      step="1"
                      value={value}
                      onChange={(event) => setValue(event.target.value)}
                      className="!w-36"
                      aria-label={`Population estimate for ${area.name}`}
                    />
                    <Button size="sm" onClick={() => save(area)} disabled={saving}>
                      Save
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {formError ? (
        <div className="mt-4">
          <Notice tone="error" title="Population not saved">
            {formError}
          </Notice>
        </div>
      ) : null}
    </div>
  );
}
