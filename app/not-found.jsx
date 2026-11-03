import Link from "next/link";
import Container from "@/ui/components/ui/Container";

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <Container className="max-w-2xl text-center">
      <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Page not found</h1>
      <p className="mt-4 text-slate-600">
        The page you asked for does not exist or has not been built yet.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Back to home
      </Link>
    </Container>
  );
}
