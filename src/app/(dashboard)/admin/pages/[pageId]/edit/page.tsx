import type { Metadata } from "next";

import { PageEditorPage } from "@/features/pages/components/page-editor-page";

export const instant = false;

export const metadata: Metadata = {
  title: "Edit page",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function Page({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await params;
  return <PageEditorPage pageId={pageId} />;
}
