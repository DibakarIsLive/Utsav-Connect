"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Notice from "@/ui/components/ui/Notice";
import Field, { TextArea } from "@/ui/components/ui/Field";
import { Button } from "@/ui/components/ui/Button";
import { apiFetch } from "@/ui/lib/api-client";

/** Sensitive lifecycle action: reason required, server enforces permission. */
export default function DevoteeStatusActions({ accountId, status }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function change(nextStatus) {
    setError(null);
    setMessage(null);
    if (reason.trim().length < 5) {
      setError("Provide a reason of at least 5 characters.");
      return;
    }
    setBusy(true);
    try {
      const data = await apiFetch(`/api/admin/accounts/${accountId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, reason: reason.trim() }),
      });
      setMessage(data?.message ?? "Account status updated.");
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <h2 className="text-base font-semibold text-bark-900">Account status</h2>
      <p className="mt-1 text-[0.74rem] text-ink-500">
        Current status: <strong>{status}</strong>. Suspension revokes all active sessions
        immediately.
      </p>
      <div className="mt-4 space-y-3">
        <Field id="statusReason" label="Reason for this action" required>
          <TextArea
            id="statusReason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Record why this status change is needed"
          />
        </Field>
        {error ? (
          <Notice tone="error" title="Status change failed">
            {error}
          </Notice>
        ) : null}
        {message ? (
          <Notice tone="success" title="Status updated">
            {message}
          </Notice>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {status !== "suspended" ? (
            <Button variant="secondary" onClick={() => change("suspended")} disabled={busy}>
              Suspend devotee
            </Button>
          ) : null}
          {status === "suspended" ? (
            <Button onClick={() => change("active")} disabled={busy}>
              Reinstate devotee
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
