import Breadcrumbs from "@/ui/components/ui/Breadcrumbs";
import { ArchTexture, CornerFlourish } from "@/ui/components/ui/Ornament";
import { cn } from "@/ui/lib/cn";

/**
 * Consistent inner-page hero. Dark bark panel, warm arch texture, and a
 * generous editorial headline. Public pages use this instead of repeating
 * one-off headers.
 */
export default function PageHero({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
  children,
  className = "",
}) {
  return (
    <section className={cn("relative isolate overflow-hidden bg-bark-950 text-ivory", className)}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_120%_at_10%_0%,rgba(232,91,0,0.28),transparent_55%),radial-gradient(ellipse_60%_100%_at_95%_10%,rgba(217,154,56,0.15),transparent_55%)]" />
      <div className="pattern-jaali absolute inset-0 opacity-[0.16]" aria-hidden="true" />
      <ArchTexture className="text-gold-300" />
      <CornerFlourish className="top-0 right-0" />
      <div className="shell relative py-16 sm:py-20 lg:py-24">
        {breadcrumbs ? <Breadcrumbs items={breadcrumbs} tone="dark" className="mb-7" /> : null}
        <p className="eyebrow text-gold-300">{eyebrow}</p>
        <h1 className="mt-4 max-w-4xl text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.045em] text-balance sm:text-[3.7rem] lg:text-[4.4rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-6 max-w-2xl text-[1.02rem] leading-[1.8] text-ivory/65">{description}</p>
        ) : null}
        {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
        {children}
      </div>
      <div className="absolute right-0 bottom-0 left-0 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />
    </section>
  );
}
