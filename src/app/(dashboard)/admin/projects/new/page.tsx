import type { Metadata } from "next";

import { ProjectEditorPage } from "@/features/projects/components/project-editor-page";

export const instant = false;

export const metadata: Metadata = {
  title: "Create project",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <ProjectEditorPage />;
}
