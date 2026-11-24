import type { Metadata } from "next";

import { PageEditorPage } from "@/features/pages/components/page-editor-page";

export const instant = false;

export const metadata: Metadata = {
  title: "New page",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <PageEditorPage />;
}
