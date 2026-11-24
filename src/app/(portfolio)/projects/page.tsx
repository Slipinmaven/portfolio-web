import { Suspense } from "react";
import type { Metadata } from "next";

import { getPublishedProjects } from "@/features/projects/api/public-projects";
import { PublicProjectIndex } from "@/features/projects/components/public-project-index";

export const metadata: Metadata = {
  title: "Selected work",
  description: "A closer look at published projects and the ideas behind them.",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <p className="py-24 text-center text-sm text-muted" role="status">
          Loading projects…
        </p>
      }
    >
      <ProjectIndexContent />
    </Suspense>
  );
}

async function ProjectIndexContent() {
  const { projects, total } = await getPublishedProjects(0, 100);
  return <PublicProjectIndex projects={projects} total={total} />;
}
