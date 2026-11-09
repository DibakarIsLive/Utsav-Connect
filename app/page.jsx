import Image from "next/image";
import Link from "next/link";
import Reveal from "@/ui/components/ui/Reveal";
import { ButtonLink, ArrowRight } from "@/ui/components/ui/Button";
import { LotusDivider, CornerFlourish, ArchTexture } from "@/ui/components/ui/Ornament";
import VenueSection from "@/ui/components/home/VenueSection";

export const metadata = {
  title: "Utsav-Connect · Mahotsav outreach, mapped together",
  description:
    "Utsav-Connect brings the Mahotsav outreach community together — find the official venue, learn about the platform, and apply to become a devotee.",
};

export default function HomePage() {
  return (
    <>
      <section className="bg-bark-950 text-ivory relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/ashram/deoghar-avenue.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(43,15,4,0.96)_0%,rgba(43,15,4,0.88)_42%,rgba(43,15,4,0.6)_70%,rgba(43,15,4,0.45)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_15%_20%,rgba(232,91,0,0.22),transparent_60%)]" />
        </div>
        <div className="pattern-jaali absolute inset-0 opacity-[0.14]" aria-hidden="true" />
        <ArchTexture className="text-gold-200/50" />
        <CornerFlourish className="top-24 right-6 hidden lg:block" />

        <div className="shell relative grid items-center gap-14 pt-[9.5rem] pb-16 sm:pt-[10.5rem] lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 lg:pt-[11rem] lg:pb-24">
          <div>
            <Reveal y={14}>
              <p className="eyebrow text-gold-300 flex items-center gap-3">
                <span className="bg-gold-400/70 h-px w-8" aria-hidden="true" />
                Mahotsav outreach
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="mt-6 max-w-2xl text-[2.85rem] leading-[0.98] font-semibold tracking-[-0.05em] text-balance sm:text-[4.1rem] lg:text-[4.7rem]">
                Every invitation.
                <br />
                Every locality.
                <br />
                <span className="text-gold-300 italic">One shared map.</span>
              </h1>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="text-ivory/65 mt-7 max-w-xl text-[1.02rem] leading-[1.8]">
                Utsav-Connect helps the Mahotsav outreach community find the official venue and
                coordinate locality by locality. Find Kulti Golf Ground, learn about the platform,
                and apply to become a devotee.
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <ButtonLink href="/apply" variant="primary" size="lg">
                  Apply to join
                  <ArrowRight />
                </ButtonLink>
                <Link
                  href="/about"
                  variant="outline-light"
                  size="lg"
                >
                  Learn more <ArrowRight />
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.2} className="relative mx-auto w-full max-w-md lg:mx-0 lg:ml-auto">
            <div className="relative">
              <div className="relative overflow-hidden rounded-t-[12rem] rounded-b-[2rem] border border-white/20 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.8)]">
                <div className="relative aspect-[4/5]">
                  <Image
                    src="/images/satsang/deoghar-gathering.webp"
                    alt="Devotees gathered at the Mahotsav venue"
                    fill
                    priority
                    loading="eager"
                    sizes="(min-width: 1024px) 38vw, 90vw"
                    className="object-cover"
                  />
                  <div className="from-bark-950/80 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
                </div>
                <div className="absolute right-4 bottom-4 left-4 rounded-2xl border border-white/15 bg-bark-950/55 px-4 py-3 backdrop-blur-md">
                  <p className="text-[0.58rem] font-bold tracking-[0.18em] text-gold-300 uppercase">
                    Kulti Golf Ground · Kulti
                  </p>
                  <p className="font-display mt-1 text-lg leading-snug font-semibold text-ivory">
                    The heart of the Mahotsav
                  </p>
                </div>
              </div>
              <p className="text-ivory/35 mt-4 text-center text-[0.58rem] tracking-[0.12em] uppercase lg:text-right">
                Photograph by Pinakpani · CC BY 4.0
              </p>
            </div>
          </Reveal>
        </div>

        <div className="absolute right-0 bottom-0 left-0 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
      </section>

      <VenueSection />

      <section className="bg-bark-950 text-ivory relative overflow-hidden py-20 sm:py-24">
        <div className="pattern-jaali absolute inset-0 opacity-[0.12]" aria-hidden="true" />
        <div className="absolute -left-32 top-0 h-72 w-72 rounded-full bg-saffron-600/10 blur-3xl" aria-hidden="true" />
        <div className="shell relative">
          <Reveal>
            <div className="flex flex-col items-center text-center">
              <p className="eyebrow text-gold-300">Rooted in a living tradition</p>
              <h2 className="mt-5 max-w-3xl text-[2.15rem] leading-[1.08] font-semibold tracking-[-0.04em] text-balance sm:text-[2.9rem]">
                A platform shaped by the spirit of Satsang.
              </h2>
              <p className="text-ivory/60 mt-5 max-w-2xl text-[1rem] leading-[1.8]">
                Satsang draws its inspiration from the life and teachings of Shree Shree Thakur
                Anukulchandra. This outreach platform is a modern instrument for an old
                purpose — gathering people, serving communities, and moving together with care.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-12 flex flex-col items-center gap-4">
              <Link
                href="/about"
                className="text-gold-300 hover:text-gold-200 inline-flex items-center gap-1.5 text-sm font-semibold"
              >
                Learn more about Utsav-Connect <ArrowRight />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
