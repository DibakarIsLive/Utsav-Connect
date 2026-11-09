"use client";

import { useEffect, useState } from "react";
import Modal from "@/ui/components/ui/Modal";
import Field, { SelectInput, TextArea, TextInput } from "@/ui/components/ui/Field";
import Notice from "@/ui/components/ui/Notice";
import { Button, ArrowRight } from "@/ui/components/ui/Button";
import { apiFetch, fieldErrors } from "@/ui/lib/api-client";

const EMPTY_FORM = {
  name: "",
  type: "Locality",
  parentId: "",
  formattedAddress: "",
  notes: "",
  latitude: "",
  longitude: "",
  boundary: "",
};

/**
 * Proposal form. A submitted proposal is explicitly *not* an approved area:
 * the success state says so, and the public map is refreshed only to fetch
 * fresh official data.
 */
export default function ProposeAreaModal({
  open,
  onClose,
  areas = [],
  defaultParentId = "",
  onSubmitted,
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, parentId: defaultParentId });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM, parentId: defaultParentId });
      setErrors({});
      setSuccess(false);
      setShowAdvanced(false);
    }
  }, [open, defaultParentId]);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    if (errors[name] || errors.submit) {
      setErrors((current) => ({ ...current, [name]: undefined, submit: undefined }));
    }
  }

  function validate() {
    const next = {};
    if (form.name.trim().length < 2) next.name = "Enter the locality name (at least 2 characters).";
    if (form.name.trim().length > 120) next.name = "Keep the name under 120 characters.";
    if (form.type.trim().length > 50) next.type = "Keep the type under 50 characters.";
    if (form.notes.length > 2000) next.notes = "Keep notes under 2000 characters.";
    if (form.latitude || form.longitude) {
      const lat = Number(form.latitude);
      const lng = Number(form.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        next.coordinates = "Enter both latitude and longitude as numbers.";
      } else if (lat < -90 || lat > 90) {
        next.coordinates = "Latitude must be between -90 and 90.";
      } else if (lng < -180 || lng > 180) {
        next.coordinates = "Longitude must be between -180 and 180.";
      }
    }
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      if (nextErrors.name) document.getElementById("proposalName")?.focus();
      return;
    }

    setBusy(true);
    setErrors({});
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type.trim() || "Locality",
        parentId: form.parentId || null,
        formattedAddress: form.formattedAddress.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };

      if (form.latitude && form.longitude) {
        payload.location = {
          type: "Point",
          coordinates: [Number(form.longitude), Number(form.latitude)],
        };
      }

      if (form.boundary.trim()) {
        let parsed;
        try {
          parsed = JSON.parse(form.boundary);
        } catch {
          throw new Error("The boundary JSON is not valid. Paste an array of [longitude, latitude] rings.");
        }
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error("The boundary must be a non-empty GeoJSON coordinate array.");
        }
        payload.boundary = { type: "Polygon", coordinates: parsed };
      }

      const data = await apiFetch("/api/areas/proposals", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSuccess(true);
      onSubmitted?.(data?.proposal);
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
      title={success ? "Proposal received" : "Propose a locality"}
      description={
        success
          ? undefined
          : "Share a place you know. An administrator will check it against existing areas, duplicates and available evidence before it can join the official map."
      }
      size="lg"
      footer={
        success ? (
          <Button onClick={onClose}>Done <ArrowRight /></Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={busy}>
              {busy ? "Submitting proposal…" : "Submit for review"}
            </Button>
          </>
        )
      }
    >
      {success ? (
        <div>
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
                <path
                  d="M12 3.5 4.8 6.8v5.1c0 4.2 3 7.8 7.2 9.1 4.2-1.3 7.2-4.9 7.2-9.1V6.8L12 3.5Zm-2.7 8.6 1.9 1.9 3.6-3.8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <h3 className="text-bark-900 text-lg font-semibold">Thank you for the lead.</h3>
              <p className="text-ink-500 mt-2 text-sm leading-[1.75]">
                <strong className="text-bark-900">{form.name.trim()}</strong> is now a pending
                proposal. It does <strong>not</strong> appear on the public map and does not change
                any invitation or coverage totals while it is reviewed.
              </p>
            </div>
          </div>
          <Notice tone="info" className="mt-5" title="What happens next">
            An administrator may approve it as a new approved area, ask for a correction, mark it as
            a duplicate, or decline it. You can follow the proposal in your dashboard.
          </Notice>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {errors.submit ? <Notice tone="error" title="Proposal not submitted">{errors.submit}</Notice> : null}

          <Field id="proposalName" label="Locality name" required error={errors.name}>
            <TextInput
              id="proposalName"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              invalid={Boolean(errors.name)}
              placeholder="e.g. Anand Vihar, Sector 4"
              autoComplete="off"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="proposalType"
              label="Type"
              hint="Locality, ward, village…"
              error={errors.type}
            >
              <TextInput
                id="proposalType"
                value={form.type}
                onChange={(event) => update("type", event.target.value)}
                invalid={Boolean(errors.type)}
                placeholder="Locality"
                list="proposal-type-options"
              />
              <datalist id="proposal-type-options">
                {["Locality", "Ward", "Village", "Town", "District", "Region"].map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </Field>
            <Field id="proposalParent" label="Parent area" hint="Optional">
              <SelectInput
                id="proposalParent"
                value={form.parentId}
                onChange={(event) => update("parentId", event.target.value)}
              >
                <option value="">None — top level</option>
                {areas.map((area) => (
                  <option key={area._id} value={area._id}>
                    {area.name} ({area.type || "Area"})
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>

          <Field id="proposalAddress" label="Address or landmark" hint="Optional">
            <TextInput
              id="proposalAddress"
              value={form.formattedAddress}
              onChange={(event) => update("formattedAddress", event.target.value)}
              placeholder="Nearest landmark, road, or how local people describe it"
            />
          </Field>

          <Field
            id="proposalNotes"
            label="Why this place matters"
            hint={`${form.notes.length}/2000`}
            error={errors.notes}
          >
            <TextArea
              id="proposalNotes"
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              rows={3}
              invalid={Boolean(errors.notes)}
              placeholder="Share local context the reviewer should know. Do not include personal details about residents."
            />
          </Field>

          <div className="border-line rounded-2xl border bg-cream/50">
            <button
              type="button"
              onClick={() => setShowAdvanced((value) => !value)}
              aria-expanded={showAdvanced}
              className="text-ink-600 hover:text-bark-900 flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[0.78rem] font-semibold"
            >
              Add coordinates or a boundary
              <span aria-hidden="true" className="text-ink-400 text-lg leading-none">
                {showAdvanced ? "−" : "+"}
              </span>
            </button>
            {showAdvanced ? (
              <div className="border-line space-y-4 border-t px-4 py-4">
                <p className="text-ink-400 text-[0.7rem] leading-relaxed">
                  Only enter coordinates you can verify from a reliable source. Leave these blank
                  rather than guessing.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="proposalLatitude" label="Latitude" hint="−90 to 90">
                    <TextInput
                      id="proposalLatitude"
                      type="number"
                      step="any"
                      value={form.latitude}
                      onChange={(event) => update("latitude", event.target.value)}
                      placeholder="e.g. 24.4823"
                      invalid={Boolean(errors.coordinates)}
                    />
                  </Field>
                  <Field id="proposalLongitude" label="Longitude" hint="−180 to 180">
                    <TextInput
                      id="proposalLongitude"
                      type="number"
                      step="any"
                      value={form.longitude}
                      onChange={(event) => update("longitude", event.target.value)}
                      placeholder="e.g. 86.6954"
                      invalid={Boolean(errors.coordinates)}
                    />
                  </Field>
                </div>
                {errors.coordinates ? (
                  <p role="alert" className="text-xs font-medium text-red-700">
                    {errors.coordinates}
                  </p>
                ) : null}
                <Field
                  id="proposalBoundary"
                  label="GeoJSON polygon coordinates"
                  hint="Advanced / optional"
                >
                  <TextArea
                    id="proposalBoundary"
                    value={form.boundary}
                    onChange={(event) => update("boundary", event.target.value)}
                    rows={2}
                    className="font-mono text-[0.72rem]"
                    placeholder="[[[lng,lat],[lng,lat],[lng,lat],[lng,lat]]]"
                  />
                </Field>
              </div>
            ) : null}
          </div>

          <p className="text-ink-400 text-[0.68rem] leading-relaxed">
            Proposals are private to you and authorised reviewers. They never appear as approved
            localities or affect public totals.
          </p>
        </form>
      )}
    </Modal>
  );
}
