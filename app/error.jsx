"use client";

import Container from "@/ui/components/ui/Container";

/**
 * Route-level error boundary (roadmap Phase 1.6). Receives the thrown error
 * and a `reset` callback from Next.js. Internal error details are never
 * rendered; they are available in the server logs.
 */
export default function RouteError({ reset }) {
  return (
    <Container className="max-w-2xl text-center">
      <p className="text-sm font-semibold tracking-wide text-red-700 uppercase">Error</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        Something went wrong
      </h1>
      <p className="mt-4 text-slate-600">
        The page could not be displayed. You can try again; if the problem continues, please report
        it to the campaign administrators.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-8 inline-block rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Try again
      </button>
    </Container>
  );
}
