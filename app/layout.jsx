import { Fraunces, Manrope } from "next/font/google";
import "@/ui/styles/globals.css";
import AppChrome from "@/ui/components/layout/AppChrome";
import SessionProvider from "@/ui/components/providers/SessionProvider";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Utsav-Connect · Mahotsav outreach, mapped together",
    template: "%s · Utsav-Connect",
  },
  description:
    "A shared campaign map and transparent invitation-reporting platform for the Mahotsav outreach community. Explore approved localities, follow coverage, and join the effort.",
  keywords: [
    "Mahotsav",
    "Satsang",
    "Kulti",
    "outreach",
    "invitation reporting",
  ],
  openGraph: {
    title: "Utsav-Connect · Every invitation. Every locality. One shared map.",
    description:
      "Find the official Mahotsav venue, learn about the platform, and apply to become a devotee.",
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "/images/ashram/deoghar-avenue.webp",
        width: 2200,
        height: 1650,
        alt: "Approach and grounds at the Mahotsav venue",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Utsav-Connect · Every invitation. Every locality. One shared map.",
    description:
      "A shared campaign map and transparent invitation-reporting platform for the Mahotsav outreach community.",
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: "#431806",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${manrope.variable} h-full`}
      data-scroll-behavior="smooth"
    >
      <body className="flex min-h-full flex-col overflow-x-clip">
        <a
          href="#main-content"
          className="focus:bg-bark-950 focus:text-ivory sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-xl focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:shadow-lg"
        >
          Skip to main content
        </a>
        <SessionProvider>
          <AppChrome>{children}</AppChrome>
        </SessionProvider>
      </body>
    </html>
  );
}
