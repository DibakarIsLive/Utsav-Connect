/**
 * Standard page heading block: optional eyebrow, title, and lead paragraph.
 *
 * @param {{ eyebrow?: string, title: string, description?: string }} props
 */
export default function PageHeader({ eyebrow, title, description }) {
  return (
    <header className="mb-10">
      {eyebrow ? (
        <p className="mb-2 text-sm font-semibold tracking-wide text-brand-700 uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
      {description ? (
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">{description}</p>
      ) : null}
    </header>
  );
}
