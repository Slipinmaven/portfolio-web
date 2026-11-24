import type { Metadata } from "next";

import { ProjectEditorPage } from "@/features/projects/components/project-editor-page";

export const instant = false;

export const metadata: Metadata = {
  title: "Edit project",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectEditorPage projectId={projectId} />;
}
