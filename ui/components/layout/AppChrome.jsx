"use client";

import { usePathname } from "next/navigation";
import SiteHeader from "@/ui/components/layout/SiteHeader";
import SiteFooter from "@/ui/components/layout/SiteFooter";

/**
 * The administrative workspace has its own shell. Every other route keeps
 * the public header/footer and receives top padding for the fixed header.
 */
export default function AppChrome({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isHome = pathname === "/";

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader />
      <main id="main-content" className={isHome ? "" : "pt-[4.5rem]"}>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
