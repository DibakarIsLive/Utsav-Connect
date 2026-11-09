"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Logo from "@/ui/components/ui/Logo";
import Badge from "@/ui/components/ui/Badge";
import { useSession } from "@/ui/components/providers/SessionProvider";
import { getAdminNavGroups, isAdminPathActive } from "@/ui/lib/admin-navigation";
import { initials } from "@/ui/lib/format";
import { cn } from "@/ui/lib/cn";

function NavIcon({ name, className = "h-4.5 w-4.5" }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      {name === "grid" ? (
        <g {...common}>
          <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
          <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
        </g>
      ) : null}
      {name === "user-check" ? (
        <g {...common}>
          <circle cx="9.5" cy="8" r="3.4" />
          <path d="M3.8 20c0-3.1 2.5-5.6 5.7-5.6 1.4 0 2.7.5 3.7 1.3M15.5 17.4l2 2 3.5-4" />
        </g>
      ) : null}
      {name === "map" ? (
        <g {...common}>
          <path d="M9 3 3.8 5.1v15.4L9 18.4l6 2.1 5.2-2.1V3.1L15 5.2 9 3Zm0 0v15.4m6-13.2v15.3" />
        </g>
      ) : null}
      {name === "compass" ? (
        <g {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m15.2 8.8-1.8 4.6-4.6 1.8 1.8-4.6 4.6-1.8Z" />
        </g>
      ) : null}
      {name === "report" ? (
        <g {...common}>
          <path d="M6 3.8h9l3 3V20H6V3.8Zm3 5h6m-6 4h6m-6 4h3.5" />
        </g>
      ) : null}
      {name === "users" ? (
        <g {...common}>
          <circle cx="9.5" cy="8" r="3.2" />
          <path d="M3.8 19.5v-1c0-2.6 2.1-4.7 4.7-4.7h2c2.6 0 4.7 2.1 4.7 4.7v1M16 5.2a3.2 3.2 0 0 1 0 6M17.5 14.1c1.7.5 2.9 2.1 2.9 4v1.4" />
        </g>
      ) : null}
      {name === "shield" ? (
        <g {...common}>
          <path d="M12 3.5 5 6.6v5.2c0 4 2.9 7.5 7 8.8 4.1-1.3 7-4.8 7-8.8V6.6l-7-3.1Z" />
          <path d="m9.2 11.8 2 2 3.6-3.8" />
        </g>
      ) : null}
      {name === "arrow" ? (
        <g {...common}>
          <path d="M5 12h13m0 0-4.5-4.5M18 12l-4.5 4.5" />
        </g>
      ) : null}
      {name === "logout" ? (
        <g {...common}>
          <path d="M13.5 7V5.2c0-.9-.8-1.7-1.7-1.7H5.2c-.9 0-1.7.8-1.7 1.7v13.6c0 .9.8 1.7 1.7 1.7h6.6c.9 0 1.7-.8 1.7-1.7V17M9.5 12h10.5m0 0-2.8-2.8M20 12l-2.8 2.8" />
        </g>
      ) : null}
      {name === "external" ? (
        <g {...common}>
          <path d="M13.5 4.5H19v5.5M19 4.5 11 12.5M9 5H5.5A1.5 1.5 0 0 0 4 6.5v12A1.5 1.5 0 0 0 5.5 20h12a1.5 1.5 0 0 0 1.5-1.5V15" />
        </g>
      ) : null}
      {name === "menu" ? (
        <g {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </g>
      ) : null}
      {name === "close" ? (
        <g {...common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </g>
      ) : null}
    </svg>
  );
}

function NavList({ groups, pathname, onNavigate }) {
  return (
    <nav aria-label="Admin sections" className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="text-ivory/30 px-3 text-[0.6rem] font-bold tracking-[0.18em] uppercase">
            {group.label}
          </p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map((item) => {
              const active = isAdminPathActive(item.href, pathname ?? "");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.82rem] font-semibold transition-colors",
                      active
                        ? "bg-white/10 text-ivory"
                        : "text-ivory/55 hover:bg-white/[0.06] hover:text-ivory",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "bg-gold-400 absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 rounded-full transition-opacity",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <NavIcon
                      name={item.icon}
                      className={cn(
                        "h-4.5 w-4.5 shrink-0 transition-colors",
                        active ? "text-gold-300" : "text-ivory/35 group-hover:text-ivory/60",
                      )}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Administrative chrome: a dark, permission-aware sidebar on desktop and a
 * focus-managed drawer on smaller screens. It is deliberately distinct from
 * the public site so reviewers know they are in a privileged workspace.
 */
export default function AdminShell({ user, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();
  const { signOut } = useSession();
  const [open, setOpen] = useState(false);
  const closeRef = useRef(null);

  const groups = getAdminNavGroups(user);
  const roleLabel = user.role === "super_admin" ? "Super Admin" : "Administrator";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="bg-cream min-h-screen">
      <aside className="bg-bark-950 text-ivory fixed inset-y-0 left-0 z-30 hidden w-[17.5rem] flex-col lg:flex">
        <div className="pattern-jaali pointer-events-none absolute inset-0 opacity-[0.1]" aria-hidden="true" />
        <div className="relative px-5 pt-6 pb-5">
          <Link href="/admin" className="inline-flex rounded-xl" aria-label="Admin workspace home">
            <Logo tone="light" showTagline={false} />
          </Link>
          <p className="text-gold-300 mt-3 text-[0.58rem] font-bold tracking-[0.2em] uppercase">
            {roleLabel} workspace
          </p>
        </div>

        <div className="no-scrollbar relative flex-1 overflow-y-auto px-3 pb-5">
          <NavList groups={groups} pathname={pathname} />
        </div>

        <div className="border-ivory/10 relative border-t px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="bg-gold-400 text-bark-950 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-bold">
              {initials(user.fullName)}
            </span>
            <div className="min-w-0">
              <p className="text-ivory truncate text-[0.8rem] font-semibold">{user.fullName}</p>
              <p className="text-ivory/40 truncate text-[0.66rem]">{roleLabel}</p>
            </div>
          </div>
          <div className="mt-3 grid gap-1">
            <Link
              href="/"
              className="text-ivory/50 hover:bg-white/[0.06] hover:text-ivory flex items-center gap-2 rounded-lg px-2.5 py-2 text-[0.74rem] font-medium transition-colors"
            >
              <NavIcon name="external" className="h-3.5 w-3.5" />
              View public site
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-ivory/50 hover:bg-white/[0.06] hover:text-ivory flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[0.74rem] font-medium transition-colors"
            >
              <NavIcon name="logout" className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[17.5rem]">
        <header className="border-line/80 bg-ivory/92 sticky top-0 z-20 border-b backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-expanded={open}
                aria-controls="admin-mobile-nav"
                aria-label="Open admin navigation"
                className="border-line text-bark-900 hover:border-gold-400 inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white transition-colors lg:hidden"
              >
                <NavIcon name="menu" className="h-4.5 w-4.5" />
              </button>
              <div className="min-w-0">
                <p className="text-ink-400 text-[0.58rem] font-bold tracking-[0.16em] uppercase">
                  Utsav-Connect
                </p>
                <p className="text-bark-900 truncate text-[0.82rem] font-semibold">
                  Administrative workspace
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Badge tone={user.role === "super_admin" ? "gold" : "neutral"} className="hidden sm:inline-flex">
                {roleLabel}
              </Badge>
              <span className="bg-bark-900 text-ivory flex h-8 w-8 items-center justify-center rounded-full text-[0.64rem] font-bold">
                {initials(user.fullName)}
              </span>
            </div>
          </div>
        </header>

        <main id="admin-main" className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Close admin navigation"
              className="bg-bark-950/50 fixed inset-0 z-40 backdrop-blur-sm lg:hidden"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              id="admin-mobile-nav"
              role="dialog"
              aria-modal="true"
              aria-label="Admin navigation"
              initial={reduce ? false : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={reduce ? undefined : { x: "-100%" }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="bg-bark-950 text-ivory fixed inset-y-0 left-0 z-50 flex w-[18rem] max-w-[86vw] flex-col lg:hidden"
            >
              <div className="pattern-jaali pointer-events-none absolute inset-0 opacity-[0.1]" aria-hidden="true" />
              <div className="relative flex items-start justify-between gap-3 px-5 pt-5 pb-4">
                <Link href="/admin" onClick={() => setOpen(false)} aria-label="Admin workspace home">
                  <Logo tone="light" showTagline={false} />
                </Link>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close admin navigation"
                  className="text-ivory/60 hover:bg-white/10 hover:text-ivory inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                >
                  <NavIcon name="close" className="h-4.5 w-4.5" />
                </button>
              </div>
              <p className="text-gold-300 relative px-5 text-[0.58rem] font-bold tracking-[0.2em] uppercase">
                {roleLabel} workspace
              </p>
              <div className="no-scrollbar relative flex-1 overflow-y-auto px-3 py-5">
                <NavList groups={groups} pathname={pathname} onNavigate={() => setOpen(false)} />
              </div>
              <div className="border-ivory/10 relative border-t px-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="bg-gold-400 text-bark-950 flex h-9 w-9 items-center justify-center rounded-full text-[0.72rem] font-bold">
                    {initials(user.fullName)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-ivory truncate text-[0.8rem] font-semibold">{user.fullName}</p>
                    <p className="text-ivory/40 truncate text-[0.66rem]">{user.email}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/"
                    onClick={() => setOpen(false)}
                    className="border-ivory/15 text-ivory/70 hover:bg-white/10 hover:text-ivory inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[0.72rem] font-semibold"
                  >
                    Public site
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="border-ivory/15 text-ivory/70 hover:bg-white/10 hover:text-ivory inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[0.72rem] font-semibold"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
