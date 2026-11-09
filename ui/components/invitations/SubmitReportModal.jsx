"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/ui/components/ui/Modal";
import Field, { TextArea, TextInput } from "@/ui/components/ui/Field";
import Notice from "@/ui/components/ui/Notice";
import { Button, ArrowRight } from "@/ui/components/ui/Button";
import { apiFetch, fieldErrors } from "@/ui/lib/api-client";
import { formatDate, todayInputValue } from "@/ui/lib/format";
import { cn } from "@/ui/lib/cn";

const EMPTY_FORM = {
  areaId: "",
  invitationCount: "",
  reportDate: todayInputValue(),
  description: "",
};

/**
 * Invitation reporting stays deliberately simple: an approved locality, a
 * number, a date, and optional context. No invitee names or phone numbers are
 * collected, and the form never reports success unless the API confirms it.
 */
export default function SubmitReportModal({ open, onClose, areas = [], onSubmitted }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);

  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({ ...EMPTY_FORM, areaId: areas.length === 1 ? areas[0]._id : "" });
    setErrors({});
    setSuccess(null);
    setSearch("");
  }, [open, areas]);

  const filteredAreas = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return areas;
    return areas.filter(
      (area) =>
        area.name?.toLowerCase().includes(term) ||
        area.code?.toLowerCase().includes(term) ||
        area.type?.toLowerCase().includes(term),
    );
  }, [areas, search]);

  const selectedArea = areas.find((area) => area._id === form.areaId) ?? null;

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    if (errors[name] || errors.submit) {
      setErrors((current) => ({ ...current, [name]: undefined, submit: undefined }));
    }
  }

  function validate() {
    const next = {};
    if (!form.areaId) next.areaId = "Choose the approved locality where you extended invitations.";
    const count = Number(form.invitationCount);
    if (!form.invitationCount || !Number.isInteger(count) || count < 1) {
      next.invitationCount = "Enter a whole number of invitations (at least 1).";
    } else if (count > 100000) {
      next.invitationCount = "That number is higher than this form accepts. Please check it.";
    }
    if (!form.reportDate) {
      next.reportDate = "Choose the date the invitations were extended.";
    } else if (Number.isNaN(new Date(form.reportDate).getTime())) {
      next.reportDate = "Enter a valid date.";
    } else if (form.reportDate > todayInputValue()) {
      next.reportDate = "A report date cannot be in the future.";
    }
    if (form.description.length > 1000) {
      next.description = "Keep the note under 1000 characters.";
    }
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

    setBusy(true);
    setErrors({});
    try {
      const data = await apiFetch("/api/invitations", {
        method: "POST",
        body: JSON.stringify({
          areaId: form.areaId,
          invitationCount: Number(form.invitationCount),
          reportDate: form.reportDate,
          description: form.description.trim() || undefined,
        }),
      });
      setSuccess({
        report: data?.report ?? null,
        areaName: selectedArea?.name ?? "the selected locality",
        count: Number(form.invitationCount),
        date: form.reportDate,
      });
      onSubmitted?.(data?.report ?? null);
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

  function recordAnother() {
    setSuccess(null);
    setErrors({});
    setForm({ ...EMPTY_FORM, areaId: areas.length === 1 ? areas[0]._id : "" });
    setSearch("");
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={success ? "Report recorded" : "Record invitations"}
      description={
        success
          ? undefined
          : "Add the invitations you personally extended in an approved locality. Only the count is stored — never the people you invited."
      }
      size="lg"
      footer={
        success ? (
          <>
            <Button variant="secondary" onClick={recordAnother}>
              Record another
            </Button>
            <Button onClick={onClose}>
              Done <ArrowRight />
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={busy || areas.length === 0}>
              {busy ? "Recording report…" : "Submit report"}
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
                {success.count.toLocaleString("en-IN")}{" "}
                {success.count === 1 ? "invitation" : "invitations"} in {success.areaName}
              </h3>
              <p className="text-ink-500 mt-2 text-sm leading-[1.75]">
                Recorded for {formatDate(success.date)}. The report is active immediately and is
                included in the locality&apos;s public coverage. Your name is never published.
              </p>
            </div>
          </div>

          <Notice tone="info" className="mt-5" title="Thank you for reporting honestly">
            Administrators can review reports. If one is flagged or invalidated, the public totals
            update automatically, and your history shows the new status.
          </Notice>
        </div>
      ) : areas.length === 0 ? (
        <Notice tone="warning" title="No approved locality is available yet">
          Invitations can only be recorded against an approved locality. Once an administrator
          publishes one, it will appear here.
        </Notice>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {errors.submit ? (
            <Notice tone="error" title="Report not submitted">
              {errors.submit}
            </Notice>
          ) : null}

          <fieldset>
            <legend className="label-base">
              Approved locality <span className="text-saffron-700">*</span>
            </legend>

            {areas.length > 6 ? (
              <div className="relative mb-2">
                <label htmlFor="reportAreaSearch" className="sr-only">
                  Search approved localities
                </label>
                <input
                  id="reportAreaSearch"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, code, or type…"
                  className="input-base !py-2.5 text-[0.82rem]"
                />
              </div>
            ) : null}

            <div
              role="radiogroup"
              aria-labelledby="reportAreaLegend"
              aria-describedby={errors.areaId ? "areaId-error" : undefined}
              className="border-line max-h-52 overflow-y-auto rounded-2xl border bg-white p-1.5"
            >
              <span id="reportAreaLegend" className="sr-only">
                Approved locality
              </span>
              {filteredAreas.length === 0 ? (
                <p className="text-ink-400 px-3 py-4 text-center text-[0.78rem]">
                  No approved locality matches “{search}”.
                </p>
              ) : (
                filteredAreas.map((area) => {
                  const checked = form.areaId === area._id;
                  return (
                    <label
                      key={area._id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                        checked ? "bg-saffron-50" : "hover:bg-cream/70",
                      )}
                    >
                      <input
                        type="radio"
                        name="reportArea"
                        value={area._id}
                        checked={checked}
                        onChange={() => update("areaId", area._id)}
                        className="accent-saffron-600 h-4 w-4 shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="text-bark-900 block truncate text-sm font-semibold">
                          {area.name}
                        </span>
                        <span className="text-ink-400 block truncate text-[0.68rem]">
                          {area.type || "Locality"}
                          {area.code ? ` · ${area.code}` : ""}
                        </span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            {errors.areaId ? (
              <p id="areaId-error" role="alert" className="mt-1.5 text-xs font-medium text-red-700">
                {errors.areaId}
              </p>
            ) : null}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="invitationCount"
              label="Invitations extended"
              required
              hint={`1 – 1,00,000`}
              error={errors.invitationCount}
            >
              <TextInput
                id="invitationCount"
                type="number"
                inputMode="numeric"
                min={1}
                max={100000}
                step={1}
                value={form.invitationCount}
                onChange={(event) => update("invitationCount", event.target.value)}
                invalid={Boolean(errors.invitationCount)}
                placeholder="e.g. 12"
              />
            </Field>

            <Field id="reportDate" label="Date invitations were extended" required error={errors.reportDate}>
              <TextInput
                id="reportDate"
                type="date"
                max={todayInputValue()}
                value={form.reportDate}
                onChange={(event) => update("reportDate", event.target.value)}
                invalid={Boolean(errors.reportDate)}
              />
            </Field>
          </div>

          <Field
            id="description"
            label="Note for your records"
            hint={`${form.description.length}/1000 · optional`}
            error={errors.description}
          >
            <TextArea
              id="description"
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              rows={3}
              maxLength={1000}
              invalid={Boolean(errors.description)}
              placeholder="For example: door-to-door visits near the market, or a family gathering. Do not record invitee names or phone numbers."
            />
          </Field>

          <div className="border-line rounded-2xl border bg-cream/60 px-4 py-3.5">
            <p className="text-ink-400 text-[0.64rem] font-bold tracking-[0.12em] uppercase">
              Summary
            </p>
            <p className="text-ink-600 mt-1.5 text-[0.8rem] leading-relaxed">
              {selectedArea ? (
                <>
                  <strong className="text-bark-900">
                    {form.invitationCount || "—"} {Number(form.invitationCount) === 1 ? "invitation" : "invitations"}
                  </strong>{" "}
                  in <strong className="text-bark-900">{selectedArea.name}</strong> on{" "}
                  {formatDate(form.reportDate)}.
                </>
              ) : (
                "Select a locality and enter the number of invitations to see a summary."
              )}
            </p>
          </div>

          <p className="text-ink-400 text-[0.68rem] leading-relaxed">
            Only approved localities accept reports. Pending proposals never appear in this list,
            and a report cannot be dated in the future.
          </p>
        </form>
      )}
    </Modal>
  );
}
