"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/ui/lib/cn";

/**
 * Devotee portal sub-navigation. Rendered only inside the authenticated
 * /dashboard layout; it is never shown on the public website.
 */
const PORTAL_LINKS = [
  { href: "/dashboard", label: "Dashboard", end: true },
  { href: "/dashboard/areas", label: "Area Details" },
  { href: "/dashboard/statistics", label: "Campaign Statistics" },
  { href: "/dashboard/invitations/new", label: "Submit Invitations" },
  { href: "/dashboard/reports", label: "My Invitation Reports" },
  { href: "/dashboard/contributions", label: "My Contributions" },
  { href: "/dashboard/profile", label: "My Profile" },
];

export default function PortalNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Devotee portal" className="border-b border-line bg-white/70">
      <div className="shell">
        <ul className="-mx-1 flex gap-1 overflow-x-auto py-2.5 sm:mx-0 sm:flex-wrap">
          {PORTAL_LINKS.map((item) => {
            const active = item.end
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex rounded-lg px-3 py-1.5 text-[0.78rem] font-semibold whitespace-nowrap transition-colors",
                    active
                      ? "bg-bark-950 text-ivory"
                      : "text-ink-500 hover:bg-cream hover:text-bark-900",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
