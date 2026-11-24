import { Suspense } from "react";

import { PortfolioHomePage } from "@/features/portfolio/components/portfolio-home-page";
import { getPublishedPage } from "@/features/pages/api/public-pages";
import { PublicPageView } from "@/features/pages/components/public-page-view";
import { getPublishedProjects } from "@/features/projects/api/public-projects";

export default function Page() {
  return (
    <Suspense
      fallback={
        <p className="py-24 text-center text-sm text-muted" role="status">
          Loading homepage…
        </p>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const page = await getPublishedPage("home");
  if (page) return <PublicPageView page={page} />;

  const { projects, total } = await getPublishedProjects(0, 4);
  return <PortfolioHomePage projects={projects} totalProjects={total} />;
}
