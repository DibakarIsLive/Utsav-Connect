import Link from "next/link";
import Container from "@/ui/components/ui/Container";
import MainNav from "@/ui/components/layout/MainNav";

export default function SiteHeader() {
  return (
    <header className="relative border-b border-slate-200 bg-white">
      <Container className="flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-white"
          >
            U
          </span>
          Utsav-Connect
        </Link>
        <MainNav />
      </Container>
    </header>
  );
}
