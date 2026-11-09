"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "@/ui/components/ui/Logo";
import MainNav from "@/ui/components/layout/MainNav";
import { useSession } from "@/ui/components/providers/SessionProvider";
import { cn } from "@/ui/lib/cn";

/**
 * Fixed public header. On the homepage it floats transparently above the
 * hero and turns into a solid ivory bar once the visitor scrolls; every other
 * page starts with the solid treatment so content is never obscured.
 */
export default function SiteHeader() {
  const pathname = usePathname();
  const { user, loading, signOut } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const isHome = pathname === "/";
  const overHero = isHome && !scrolled;

  useEffect(() => {
    if (!isHome) {
      setScrolled(false);
      return undefined;
    }
    function onScroll() {
      setScrolled(window.scrollY > 28);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-500",
        overHero
          ? "border-b border-white/10 bg-transparent"
          : "border-line/80 bg-ivory/92 border-b shadow-[0_10px_40px_-30px_rgba(43,15,4,0.5)] backdrop-blur-xl",
      )}
    >
      <div className="shell flex h-[4.5rem] items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="Utsav-Connect home"
          className="group -ml-1 flex items-center rounded-xl px-1 py-1"
        >
          <Logo
            tone={overHero ? "light" : "dark"}
            className="transition-transform duration-300 group-hover:-translate-y-0.5"
          />
        </Link>

        <MainNav
          user={user}
          loading={loading}
          overHero={overHero}
          onSignOut={signOut}
        />
      </div>
    </header>
  );
}
