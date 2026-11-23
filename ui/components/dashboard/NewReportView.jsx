"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import SubmitReportModal from "@/ui/components/invitations/SubmitReportModal";

/**
 * Dedicated route wrapper around the existing report modal. The modal keeps
 * ownership of validation and persistence; this component only supplies the
 * approved areas and navigation after the user finishes or cancels.
 */
export default function NewReportView({ areas = [] }) {
  const router = useRouter();
  const finish = () => router.push("/dashboard/reports");

  return (
    <div className="shell space-y-5 py-8 sm:py-10">
      <p className="text-sm leading-relaxed text-ink-500">
        Record only the invitations you personally extended. No invitee names, phone numbers or
        email addresses are collected. A report becomes visible in your history only after the
        server confirms it was stored.
      </p>
      {areas.length === 0 ? (
        <p className="text-sm text-ink-500">
          No approved locality is available yet, so reports cannot be recorded.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <SubmitReportModal open={areas.length > 0} onClose={finish} areas={areas} />
        <Link
          href="/dashboard/reports"
          className="text-sm font-semibold text-saffron-700 underline underline-offset-2"
        >
          Back to my reports
        </Link>
      </div>
    </div>
  );
}
