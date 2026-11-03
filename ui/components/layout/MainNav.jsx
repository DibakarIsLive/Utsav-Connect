"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { PRIMARY_NAV_ITEMS, isActivePath } from "@/ui/lib/navigation";

/**
 * Primary navigation: inline links on wide screens, a toggleable panel on
 * narrow screens (roadmap Phases 1.3 and 1.4). The panel closes when a link
 * is chosen and is wired with aria-expanded / aria-controls for screen readers.
 */
export default function MainNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const closePanel = () => setOpen(false);

  const links = PRIMARY_NAV_ITEMS.map((item) => {
    const active = isActivePath(item.href, pathname);
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={closePanel}
          aria-current={active ? "page" : undefined}
          className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            active
              ? "bg-brand-100 text-brand-900"
              : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          {item.label}
        </Link>
      </li>
    );
  });

  return (
    <nav aria-label="Primary" className="flex items-center">
      <ul className="hidden items-center gap-1 md:flex">{links}</ul>

      <button
        type="button"
        className="inline-flex items-center justify-center rounded-md p-2 text-slate-700 hover:bg-slate-100 md:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none">
          {open ? (
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>

      <ul
        id={panelId}
        hidden={!open}
        className="absolute top-full right-0 left-0 z-20 border-b border-slate-200 bg-white px-4 py-3 shadow-sm md:hidden"
      >
        {links}
      </ul>
    </nav>
  );
}
