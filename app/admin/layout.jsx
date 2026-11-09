import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { parseSessionToken } from "@/api/lib/auth/session";
import { validateSession } from "@/api/services/auth-service";
import AdminShell from "@/ui/components/admin/AdminShell";
import Logo from "@/ui/components/ui/Logo";
import { buttonClass } from "@/ui/components/ui/Button";

export const dynamic = "force-dynamic";

/**
 * Server-side gate for the admin workspace. The API still enforces every
 * granular permission; this layout only decides whether a person may see the
 * workspace at all, and gives devotees the correct destination.
 */
export default async function AdminLayout({ children }) {
  const cookieStore = await cookies();
  const token = parseSessionToken(cookieStore.toString());

  let user = null;
  let unavailable = false;

  if (token) {
    try {
      user = await validateSession(token);
    } catch {
      unavailable = true;
    }
  }

  if (unavailable) {
    return (
      <div className="bg-cream flex min-h-screen items-center justify-center px-5 py-16">
        <div className="card-paper max-w-md p-8 text-center">
          <Logo className="justify-center" />
          <h1 className="text-bark-900 mt-6 text-2xl font-semibold tracking-[-0.03em]">
            The admin workspace is temporarily unavailable.
          </h1>
          <p className="text-ink-500 mt-3 text-sm leading-[1.75]">
            The campaign database could not be reached, so no account or application data is being
            shown. Please try again in a moment.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/admin" className={buttonClass({ size: "sm" })}>
              Try again
            </Link>
            <Link href="/" className={buttonClass({ variant: "secondary", size: "sm" })}>
              Return to the public site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    redirect("/apply?mode=login");
  }

  if (user.role === "devotee") {
    redirect(user.status === "active" ? "/dashboard" : "/application-status");
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
