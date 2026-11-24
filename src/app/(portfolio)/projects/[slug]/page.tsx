import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublishedProject } from "@/features/projects/api/public-projects";
import { PublicProjectPage } from "@/features/projects/components/public-project-page";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  return project
    ? {
        title: project.title,
        description: project.short_description,
      }
    : { title: "Project not found" };
}

export default function Page({ params }: Props) {
  return (
    <Suspense
      fallback={
        <p className="py-24 text-center text-sm text-muted" role="status">
          Loading project…
        </p>
      }
    >
      <ProjectContent params={params} />
    </Suspense>
  );
}

async function ProjectContent({ params }: Props) {
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  if (!project) notFound();
  return <PublicProjectPage project={project} />;
}
