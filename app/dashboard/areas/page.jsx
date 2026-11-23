import { requireActiveDevoteePage } from "@/app/_lib/devotee-page";
import { listApprovedAreas } from "@/api/services/area-service";
import { getCoverageAnalytics } from "@/api/services/invitation-service";
import PageHero from "@/ui/components/ui/PageHero";
import MapWorkspace from "@/ui/components/maps/MapWorkspace";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Area details — Devotee portal",
  description: "Inspect approved campaign areas, boundaries and coverage.",
};

const plain = (value) => JSON.parse(JSON.stringify(value));

export default async function AreasPage() {
  await requireActiveDevoteePage();

  let areas = [];
  let analytics = [];
  let initialError = null;
  try {
    const [areaRecords, coverage] = await Promise.all([
      listApprovedAreas(),
      getCoverageAnalytics(),
    ]);
    areas = plain(areaRecords);
    analytics = plain(coverage);
  } catch {
    initialError =
      "Approved area data could not be loaded. Nothing is shown in its place rather than invented geography.";
  }

  return (
    <>
      <PageHero
        eyebrow="Devotee portal"
        title="Explore the areas we serve."
        description="Only officially approved areas are shown. Open a locality to see its boundary, place in the hierarchy and reported invitation coverage. Proposals awaiting review are never presented as approved areas."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Devotee portal", href: "/dashboard" },
          { label: "Area details" },
        ]}
      />
      <div className="shell py-8 sm:py-10">
        <MapWorkspace
          initialAreas={areas}
          initialAnalytics={analytics}
          initialError={initialError}
        />
      </div>
    </>
  );
}
