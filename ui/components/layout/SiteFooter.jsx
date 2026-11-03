import Link from "next/link";
import { APP_VERSION } from "@/api/lib/app-info";
import Container from "@/ui/components/ui/Container";
import { PRIMARY_NAV_ITEMS } from "@/ui/lib/navigation";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <Container className="flex flex-col gap-4 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Utsav-Connect <span className="font-mono text-xs text-slate-500">v{APP_VERSION}</span> —
          Mahotsav outreach platform.
        </p>
        <nav aria-label="Footer">
          <ul className="flex gap-4">
            {PRIMARY_NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-slate-900">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </footer>
  );
}
