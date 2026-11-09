"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { getAccountAction, getPrimaryNavItems, isActivePath } from "@/ui/lib/navigation";
import { buttonClass, ArrowRight } from "@/ui/components/ui/Button";
import { cn } from "@/ui/lib/cn";

/**
 * Desktop navigation plus a polished mobile drawer. The drawer closes on
 * route change and on Escape, locks background scroll while open, and
 * restores it on unmount.
 */
export default function MainNav({ user, loading = false, overHero = false, onSignOut }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const reduce = useReducedMotion();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
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
    await onSignOut?.();
    router.push("/");
    router.refresh();
  }

  const items = getPrimaryNavItems(user);
  const account = getAccountAction(user);

  if (loading) {
    return (
      <nav aria-label="Primary" className="flex items-center">
        <div className="hidden items-center gap-2 md:flex" aria-hidden="true">
          <div className={cn("h-8 w-14 animate-pulse rounded-lg", overHero ? "bg-white/15" : "bg-bark-100")} />
          <div className={cn("h-8 w-16 animate-pulse rounded-lg", overHero ? "bg-white/15" : "bg-bark-100")} />
          <div className={cn("h-9 w-28 animate-pulse rounded-xl", overHero ? "bg-white/20" : "bg-bark-100")} />
        </div>
        <div className={cn("h-10 w-10 animate-pulse rounded-xl md:hidden", overHero ? "bg-white/20" : "bg-bark-100")} />
      </nav>
    );
  }

  return (
    <nav aria-label="Primary" className="flex items-center">
      <ul className="hidden items-center gap-1 md:flex">
        {items.map((item) => {
          const active = isActivePath(item.href, pathname ?? "");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-lg px-3.5 py-2 text-[0.82rem] font-semibold tracking-[0.01em] transition-colors",
                  overHero
                    ? active
                      ? "text-white"
                      : "text-white/70 hover:text-white"
                    : active
                      ? "text-bark-950"
                      : "text-ink-600 hover:text-bark-900",
                )}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    "bg-saffron-500 absolute right-3.5 -bottom-0.5 left-3.5 h-[2px] origin-left rounded-full transition-transform duration-300",
                    active ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </Link>
            </li>
          );
        })}
        <li className="ml-3 flex items-center gap-1.5">
          <Link href={account.href} className={buttonClass({ size: "sm", variant: "primary" })}>
            {account.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                overHero
                  ? "text-white/60 hover:bg-white/10 hover:text-white"
                  : "text-ink-400 hover:bg-cream hover:text-bark-900",
              )}
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none">
                <path
                  d="M12.5 6.2V4.6A1.6 1.6 0 0 0 10.9 3H4.6A1.6 1.6 0 0 0 3 4.6v10.8A1.6 1.6 0 0 0 4.6 17h6.3a1.6 1.6 0 0 0 1.6-1.6v-1.6M8.5 10h8m0 0-2.3-2.3M16.5 10l-2.3 2.3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}
        </li>
      </ul>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm transition-colors md:hidden",
          overHero
            ? "border-white/25 bg-white/10 text-white hover:bg-white/20"
            : "border-line bg-white/70 text-bark-900 hover:border-gold-400",
        )}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          {open ? (
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          )}
        </svg>
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              className="bg-bark-950/45 fixed inset-0 z-40 backdrop-blur-sm md:hidden"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              id={panelId}
              className="border-line bg-ivory fixed inset-x-3 top-[4.7rem] z-50 overflow-hidden rounded-[1.5rem] border shadow-[0_30px_90px_-20px_rgba(43,15,4,0.45)] md:hidden"
              initial={reduce ? false : { opacity: 0, y: -12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: -8, scale: 0.99 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="pattern-jaali border-line border-b px-5 py-3">
                <p className="eyebrow text-saffron-700">Explore</p>
              </div>
              <ul className="divide-line divide-y px-5 py-2">
                {items.map((item) => {
                  const active = isActivePath(item.href, pathname ?? "");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center justify-between py-4 text-lg font-semibold",
                          active ? "text-saffron-700" : "text-bark-900",
                        )}
                      >
                        {item.label}
                        <ArrowRight className="text-ink-300 h-4 w-4" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="px-5 pt-3 pb-5">
                <Link
                  href={account.href}
                  onClick={() => setOpen(false)}
                  className={buttonClass({ size: "lg", className: "w-full" })}
                >
                  {account.label}
                  <ArrowRight />
                </Link>
                {user ? (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-ink-500 hover:text-bark-900 mt-3 w-full py-2 text-center text-xs font-semibold"
                  >
                    Sign out of this device
                  </button>
                ) : (
                  <p className="text-ink-400 mt-3 text-center text-[0.68rem] leading-relaxed">
                    One account entry for both new applications and existing accounts.
                  </p>
                )}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </nav>
  );
}
