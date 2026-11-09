import AdminPageHeader from "@/ui/components/admin/AdminPageHeader";
import Notice from "@/ui/components/ui/Notice";
import { ButtonLink } from "@/ui/components/ui/Button";
import { ADMIN_PERMISSION_LABELS } from "@/ui/lib/navigation";

/**
 * Clear, honest restricted state for admin pages. The API already refuses the
 * request; this screen explains why without pretending the section loaded.
 */
export default function AdminDenied({ title = "This section needs a different permission", permission }) {
  const label = permission ? ADMIN_PERMISSION_LABELS[permission] : null;
  return (
    <div>
      <AdminPageHeader eyebrow="Access restricted" title={title} />
      <div className="card-warm max-w-2xl p-6">
        <Notice tone="warning" title="Your account cannot open this section">
          {label
            ? `It requires the “${label}” permission.`
            : "Your account does not have the permission required for this section."}{" "}
          A Super Admin can adjust your permissions from Accounts &amp; roles. If you believe this
          is a mistake, contact the campaign team.
        </Notice>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/admin" variant="secondary">
            Back to overview
          </ButtonLink>
          <ButtonLink href="/">Open the public site</ButtonLink>
        </div>
      </div>
    </div>
  );
}
