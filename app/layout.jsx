import "@/ui/styles/globals.css";
import SiteFooter from "@/ui/components/layout/SiteFooter";
import SiteHeader from "@/ui/components/layout/SiteHeader";

export const metadata = {
  title: {
    default: "Utsav-Connect",
    template: "%s · Utsav-Connect",
  },
  description:
    "Mahotsav outreach platform: explore approved localities, report invitations, and track coverage across the campaign region.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow"
        >
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main-content" className="flex-1 py-10 sm:py-14">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
