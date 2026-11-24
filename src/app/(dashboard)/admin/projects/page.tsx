import type { Metadata } from "next";

import { ProjectListPage } from "@/features/projects/components/project-list-page";

export const instant = false;

export const metadata: Metadata = {
  title: "Projects",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <ProjectListPage />;
}
