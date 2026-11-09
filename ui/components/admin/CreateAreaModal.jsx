"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/ui/components/ui/Modal";
import Field, { SelectInput, TextArea, TextInput } from "@/ui/components/ui/Field";
import Notice from "@/ui/components/ui/Notice";
import { Button } from "@/ui/components/ui/Button";
import { apiFetch, fieldErrors } from "@/ui/lib/api-client";

const EMPTY_FORM = {
  name: "",
  type: "Locality",
  code: "",
  parentId: "",
  formattedAddress: "",
  latitude: "",
  longitude: "",
  boundary: "",
  populationEstimate: "",
  notes: "",
};

function formFromArea(area) {
  if (!area) return EMPTY_FORM;
  const parentId =
    typeof area.parentId === "object" && area.parentId
      ? (area.parentId._id ?? area.parentId.id ?? "")
      : (area.parentId ?? "");
  return {
    name: area.name ?? "",
    type: area.type ?? "Locality",
    code: area.code ?? "",
    parentId: parentId ? String(parentId) : "",
    formattedAddress: area.formattedAddress ?? "",
    latitude:
      area.location?.coordinates?.[1] !== undefined ? String(area.location.coordinates[1]) : "",
    longitude:
      area.location?.coordinates?.[0] !== undefined ? String(area.location.coordinates[0]) : "",
    boundary: area.boundary ? JSON.stringify(area.boundary, null, 2) : "",
    populationEstimate:
      area.populationEstimate !== undefined && area.populationEstimate !== null
        ? String(area.populationEstimate)
        : "",
    notes: area.notes ?? "",
  };
}

function parseBoundary(value) {
  if (!value.trim()) return { boundary: undefined };
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { error: "The boundary is not valid JSON." };
  }

  if (Array.isArray(parsed)) {
    return { boundary: { type: "Polygon", coordinates: parsed } };
  }
  if (
    parsed &&
    typeof parsed === "object" &&
    ["Polygon", "MultiPolygon"].includes(parsed.type) &&
    Array.isArray(parsed.coordinates)
  ) {
    return { boundary: parsed };
  }
  return {
    error:
      'Use a GeoJSON object such as {"type":"Polygon","coordinates":[...]} or a bare coordinate array.',
  };
}

/**
 * Create or edit an official area. Geometry is optional and only accepted when
 * it is explicit — the form never generates coordinates or a boundary.
 */
export default function CreateAreaModal({
  open,
  onClose,
  onSaved,
  existingArea = null,
  allAreas = [],
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const editing = Boolean(existingArea?._id);

  useEffect(() => {
    if (!open) return;
    setForm(formFromArea(existingArea));
    setErrors({});
    setResult(null);
  }, [open, existingArea]);

  const parentOptions = useMemo(
    () =>
      allAreas.filter((area) => {
        if (!existingArea?._id) return true;
        return String(area._id) !== String(existingArea._id);
      }),
    [allAreas, existingArea],
  );

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    if (errors[name] || errors.submit || errors.geometry) {
      setErrors((current) => ({
        ...current,
        [name]: undefined,
        submit: undefined,
        geometry: undefined,
      }));
    }
  }

  function validate() {
    const next = {};
    if (form.name.trim().length < 2) next.name = "Enter the official name (at least 2 characters).";
    if (form.name.trim().length > 120) next.name = "Keep the name under 120 characters.";
    if (form.type.trim().length > 50) next.type = "Keep the type under 50 characters.";
    if (form.code.trim().length > 30) next.code = "Keep the code under 30 characters.";
    if (form.formattedAddress.trim().length > 500) {
      next.formattedAddress = "Keep the address under 500 characters.";
    }
    if (form.notes.length > 2000) next.notes = "Keep internal notes under 2000 characters.";

    if (form.populationEstimate !== "") {
      const population = Number(form.populationEstimate);
      if (!Number.isInteger(population) || population < 0) {
        next.populationEstimate = "Population must be a whole number, zero or greater.";
      }
    }

    if (form.latitude !== "" || form.longitude !== "") {
      const lat = Number(form.latitude);
      const lng = Number(form.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        next.geometry = "Enter both latitude and longitude as numbers, or leave both blank.";
      } else if (lat < -90 || lat > 90) {
        next.geometry = "Latitude must be between −90 and 90.";
      } else if (lng < -180 || lng > 180) {
        next.geometry = "Longitude must be between −180 and 180.";
      }
    }

    const boundaryResult = parseBoundary(form.boundary);
    if (boundaryResult.error) next.geometry = boundaryResult.error;

    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      document.getElementById(Object.keys(nextErrors)[0])?.focus();
      return;
    }

    const boundaryResult = parseBoundary(form.boundary);
    const payload = {
      name: form.name.trim(),
      type: form.type.trim() || "Locality",
      parentId: form.parentId || null,
      notes: form.notes.trim() || undefined,
    };
    if (form.code.trim()) payload.code = form.code.trim();
    if (form.formattedAddress.trim()) payload.formattedAddress = form.formattedAddress.trim();
    if (form.populationEstimate !== "") payload.populationEstimate = Number(form.populationEstimate);
    if (form.latitude !== "" && form.longitude !== "") {
      payload.location = {
        type: "Point",
        coordinates: [Number(form.longitude), Number(form.latitude)],
      };
    }
    if (boundaryResult.boundary) payload.boundary = boundaryResult.boundary;

    setBusy(true);
    setErrors({});
    try {
      const data = await apiFetch(
        editing ? `/api/admin/areas/${existingArea._id}` : "/api/admin/areas",
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      setResult({
        area: data?.area ?? null,
        duplicates: data?.duplicatesFound ?? [],
      });
      onSaved?.(data?.area ?? null);
    } catch (error) {
      const mapped = fieldErrors(error.details);
      if (Object.keys(mapped).length > 0) {
        setErrors(mapped);
        document.getElementById(Object.keys(mapped)[0])?.focus();
      } else {
        setErrors({ submit: error.message });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={result ? (editing ? "Area updated" : "Area created") : editing ? "Edit area" : "Create an official area"}
      description={
        result
          ? undefined
          : "Areas become publicly visible immediately when their status is approved. Leave geometry blank unless it comes from a reliable source."
      }
      size="lg"
      footer={
        result ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Create approved area"}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div>
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
                <path
                  d="m5 12.5 4.2 4.2L19 6.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <h3 className="text-bark-900 text-lg font-semibold">
                {result.area?.name ?? form.name.trim()}
              </h3>
              <p className="text-ink-500 mt-2 text-sm leading-[1.75]">
                {editing
                  ? "The area record has been updated. Public pages will reflect the change on their next load."
                  : "The area is now approved and can receive invitation reports. It appears on the public map if geometry has been recorded."}
              </p>
            </div>
          </div>

          {result.duplicates?.length ? (
            <Notice tone="warning" className="mt-5" title="Possible duplicates were detected">
              <ul className="mt-1 space-y-1.5">
                {result.duplicates.map((duplicate) => (
                  <li key={`${duplicate.areaId}-${duplicate.reason}`}>
                    <strong>{duplicate.areaName}</strong> — {duplicate.reason}
                  </li>
                ))}
              </ul>
              <p className="mt-2">
                Nothing was merged or deleted automatically. Review the hierarchy and archive a
                duplicate manually if it is genuinely the same place.
              </p>
            </Notice>
          ) : null}
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {errors.submit ? (
            <Notice tone="error" title="Area not saved">
              {errors.submit}
            </Notice>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-[1.4fr_0.8fr]">
            <Field id="areaName" label="Official name" required error={errors.name}>
              <TextInput
                id="areaName"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                invalid={Boolean(errors.name)}
                placeholder="e.g. Deoghar"
                autoComplete="off"
              />
            </Field>
            <Field id="areaType" label="Type" hint="Free-form" error={errors.type}>
              <TextInput
                id="areaType"
                value={form.type}
                onChange={(event) => update("type", event.target.value)}
                invalid={Boolean(errors.type)}
                placeholder="Locality, Ward, District…"
                list="admin-area-types"
              />
              <datalist id="admin-area-types">
                {["Locality", "Ward", "Village", "Town", "Block", "District", "Region", "State"].map(
                  (type) => (
                    <option key={type} value={type} />
                  ),
                )}
              </datalist>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="areaCode" label="Code" hint="Optional, shown publicly" error={errors.code}>
              <TextInput
                id="areaCode"
                value={form.code}
                onChange={(event) => update("code", event.target.value)}
                invalid={Boolean(errors.code)}
                placeholder="e.g. DGR-01"
                autoComplete="off"
              />
            </Field>
            <Field id="areaParent" label="Parent area" hint="Optional">
              <SelectInput
                id="areaParent"
                value={form.parentId}
                onChange={(event) => update("parentId", event.target.value)}
              >
                <option value="">None — top level</option>
                {parentOptions.map((area) => (
                  <option key={area._id} value={area._id}>
                    {area.name} ({area.type || "Area"})
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>

          <Field
            id="areaAddress"
            label="Formatted address"
            hint="Optional"
            error={errors.formattedAddress}
          >
            <TextInput
              id="areaAddress"
              value={form.formattedAddress}
              onChange={(event) => update("formattedAddress", event.target.value)}
              invalid={Boolean(errors.formattedAddress)}
              placeholder="A verified address or landmark"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="areaPopulation" label="Population estimate" hint="Optional" error={errors.populationEstimate}>
              <TextInput
                id="areaPopulation"
                type="number"
                min={0}
                step={1}
                value={form.populationEstimate}
                onChange={(event) => update("populationEstimate", event.target.value)}
                invalid={Boolean(errors.populationEstimate)}
                placeholder="e.g. 25000"
              />
            </Field>
            <Field id="areaLatitude" label="Latitude" hint="Optional">
              <TextInput
                id="areaLatitude"
                type="number"
                step="any"
                value={form.latitude}
                onChange={(event) => update("latitude", event.target.value)}
                invalid={Boolean(errors.geometry)}
                placeholder="24.4823"
              />
            </Field>
            <Field id="areaLongitude" label="Longitude" hint="Optional">
              <TextInput
                id="areaLongitude"
                type="number"
                step="any"
                value={form.longitude}
                onChange={(event) => update("longitude", event.target.value)}
                invalid={Boolean(errors.geometry)}
                placeholder="86.6954"
              />
            </Field>
          </div>

          {errors.geometry ? (
            <p role="alert" className="text-xs font-medium text-red-700">
              {errors.geometry}
            </p>
          ) : null}

          <Field
            id="areaBoundary"
            label="GeoJSON boundary"
            hint="Optional · Polygon or MultiPolygon"
          >
            <TextArea
              id="areaBoundary"
              value={form.boundary}
              onChange={(event) => update("boundary", event.target.value)}
              rows={3}
              className="font-mono text-[0.72rem]"
              placeholder='{"type":"Polygon","coordinates":[[[86.68,24.47],[86.71,24.47],[86.71,24.50],[86.68,24.50],[86.68,24.47]]]}'
            />
          </Field>

          <Field id="areaNotes" label="Internal notes" hint={`${form.notes.length}/2000`} error={errors.notes}>
            <TextArea
              id="areaNotes"
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              rows={2}
              maxLength={2000}
              invalid={Boolean(errors.notes)}
              placeholder="Never shown publicly. Record the source of the population or boundary."
            />
          </Field>

          <p className="text-ink-400 text-[0.68rem] leading-relaxed">
            Approved areas appear publicly. Archived areas are hidden from the public map but keep
            their report history. Missing population is displayed as “unavailable”, never 0%.
          </p>
        </form>
      )}
    </Modal>
  );
}
