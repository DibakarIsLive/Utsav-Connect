"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/ui/components/ui/Modal";
import Notice from "@/ui/components/ui/Notice";
import Field, { TextArea } from "@/ui/components/ui/Field";
import { apiFetch } from "@/ui/lib/api-client";

/**
 * Irreversible account deletion. Requires a reason and an explicit checkbox;
 * the server re-checks role/permission rules for the actual target.
 */
export default function DeleteAccountDialog({ open, onClose, account, onDeleted }) {
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setConfirmed(false);
      setError(null);
    }
  }, [open]);

  const roleLabel =
    {
      devotee: "Devotee",
      admin: "Administrator",
      super_admin: "Super Admin",
    }[account?.role] ??
    account?.role ??
    "Account";

  // Different directories serialize the identifier as `id` or `_id`.
  const accountId = account?.id ?? account?._id;

  async function confirm() {
    if (!accountId || reason.trim().length < 5 || !confirmed) return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/admin/accounts/${accountId}`, {
        method: "DELETE",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      onDeleted?.(data, account);
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={busy ? () => {} : onClose}
      onConfirm={confirm}
      title="Permanently delete account"
      description="This action is irreversible. The account can no longer sign in, and its stored credentials are removed."
      confirmLabel="Delete account"
      cancelLabel="Cancel"
      destructive
      loading={busy}
    >
      <div className="space-y-4">
        <dl className="rounded-xl border border-line bg-white p-4 text-sm">
          <div className="flex justify-between gap-3 py-1">
            <dt className="text-ink-400">Name</dt>
            <dd className="font-semibold text-bark-900">{account?.fullName}</dd>
          </div>
          <div className="flex justify-between gap-3 py-1">
            <dt className="text-ink-400">Email</dt>
            <dd className="font-semibold text-bark-900">{account?.email}</dd>
          </div>
          <div className="flex justify-between gap-3 py-1">
            <dt className="text-ink-400">Role</dt>
            <dd className="font-semibold text-bark-900">{roleLabel}</dd>
          </div>
        </dl>

        <Field id="deleteReason" label="Reason for permanent deletion" required>
          <TextArea
            id="deleteReason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Why must this account be removed?"
          />
        </Field>

        <label htmlFor="deleteConfirm" className="flex items-start gap-3 text-sm text-ink-600">
          <input
            id="deleteConfirm"
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-red-600"
          />
          <span>
            I understand this is permanent and cannot be undone. Audit and historical campaign
            records are retained in anonymized form.
          </span>
        </label>

        {error ? (
          <Notice tone="error" title="Account not deleted">
            {error}
          </Notice>
        ) : null}
      </div>
    </ConfirmDialog>
  );
}
