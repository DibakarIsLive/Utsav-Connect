import { requireActiveDevoteePage } from "@/app/_lib/devotee-page";
import PortalNav from "@/ui/components/dashboard/PortalNav";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Devotee portal — Utsav-Connect",
  description: "Your private workspace for Mahotsav outreach.",
};

export default async function DashboardLayout({ children }) {
  await requireActiveDevoteePage();
  return (
    <>
      <PortalNav />
      {children}
    </>
  );
}
