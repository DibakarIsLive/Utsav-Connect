import Link from "next/link";
import Logo from "@/ui/components/ui/Logo";
import { LotusDivider } from "@/ui/components/ui/Ornament";

const QUICK_LINKS = [
  { href: "/about", label: "About the platform" },
  { href: "/apply", label: "Apply to join" },
  { href: "/application-status", label: "Application status" },
];

const OFFICIAL_LINKS = [
  { href: "https://www.satsang.org.in/", label: "Satsang, Deoghar — official site" },
  {
    href: "https://maps.app.goo.gl/BcY87xSjA6iRtBY78",
    label: "Official Mahotsav venue",
  },
];

export default function SiteFooter() {
  return (
    <footer className="bg-bark-950 text-ivory relative mt-auto overflow-hidden">
      <div className="pattern-jaali absolute inset-0 opacity-[0.14]" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
      <div className="absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-saffron-600/10 blur-3xl" aria-hidden="true" />

      <div className="shell relative pt-16 pb-10 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_0.7fr_1fr]">
          <div>
            <Link href="/" aria-label="Utsav-Connect home" className="inline-flex">
              <Logo tone="light" />
            </Link>
            <p className="text-ivory/60 mt-6 max-w-sm text-sm leading-[1.8]">
              A shared campaign map and transparent invitation-reporting platform for the Mahotsav
              outreach community — so every locality can be seen, every contribution can be
              counted, and every invitation can be followed with care.
            </p>
            <p className="text-gold-300/90 mt-6 font-display text-lg italic">
              &ldquo;Service to the living is service to the Divine.&rdquo;
            </p>
          </div>

          <div>
            <h2 className="text-[0.68rem] font-bold tracking-[0.2em] text-gold-300/80 uppercase">
              Explore
            </h2>
            <ul className="mt-5 space-y-3">
              {QUICK_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-ivory/65 hover:text-ivory text-sm transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-[0.68rem] font-bold tracking-[0.2em] text-gold-300/80 uppercase">
              Official resources
            </h2>
            <ul className="mt-5 space-y-3">
              {OFFICIAL_LINKS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ivory/65 hover:text-ivory group inline-flex items-start gap-2 text-sm transition-colors"
                  >
                    <span>{item.label}</span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      className="text-ivory/30 group-hover:text-gold-300 mt-1 h-3 w-3 shrink-0 transition-colors"
                      fill="none"
                    >
                      <path
                        d="M5 11 11 5m0 0H6m5 0v5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-ivory/35 mt-5 text-[0.7rem] leading-relaxed">
              Heritage photographs are credited on the{" "}
              <Link href="/about#credits" className="text-ivory/55 underline underline-offset-2 hover:text-ivory">
                About page
              </Link>
              . Utsav-Connect is an outreach coordination platform and is not an official
              publication of Satsang.
            </p>
          </div>
        </div>

        <LotusDivider tone="dark" className="mt-14" />

        <div className="text-ivory/40 mt-8 flex flex-col items-center justify-between gap-3 text-[0.72rem] sm:flex-row">
          <p>© {new Date().getFullYear()} Utsav-Connect. Built for the Mahotsav outreach community.</p>
          <p className="font-display text-gold-300/60 text-sm tracking-wide">Jai Guru</p>
        </div>
      </div>
    </footer>
  );
}
