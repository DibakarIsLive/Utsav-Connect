import Container from "@/ui/components/ui/Container";
import PageHeader from "@/ui/components/ui/PageHeader";
import StatusNotice from "@/ui/components/ui/StatusNotice";

export const metadata = {
  title: "Map",
  description: "Interactive map of approved campaign areas and invitation coverage.",
};

export default function MapPage() {
  return (
    <Container>
      <PageHeader
        eyebrow="Interactive map"
        title="Approved areas and coverage"
        description="This page will show official localities, their boundaries, and reported invitation coverage, with search and a list view for anyone who cannot use a map."
      />
      <StatusNotice variant="warning" title="The interactive map is not available yet.">
        Google Maps integration, official area records, and coverage statistics are scheduled for
        roadmap Stage 3 (Phases 5–8). No map configuration or geographic data exists in this build,
        so nothing is rendered here on purpose rather than showing placeholder data.
      </StatusNotice>
    </Container>
  );
}
