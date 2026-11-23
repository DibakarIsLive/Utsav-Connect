import "server-only";
import { ConflictError } from "../http/errors.js";

/**
 * Permanent account deletion is implemented but NOT approved for use.
 *
 * The owner's approved product decision is to defer permanent deletion until
 * the data-retention policy has been formally approved. This flag is the single
 * source of truth for that decision. It must only be changed after explicit
 * owner approval, together with the retention documentation and a reviewed
 * rollout. Until then, every deletion entry point (UI, API and service) is
 * refused and no deletion, anonymization or migration is performed.
 */
export const ACCOUNT_DELETION_POLICY_APPROVED = false;

export const ACCOUNT_DELETION_DISABLED_MESSAGE =
  "Permanent account deletion is disabled until the data-retention policy is formally approved.";

export function assertAccountDeletionEnabled() {
  if (!ACCOUNT_DELETION_POLICY_APPROVED) {
    throw new ConflictError(ACCOUNT_DELETION_DISABLED_MESSAGE);
  }
}
