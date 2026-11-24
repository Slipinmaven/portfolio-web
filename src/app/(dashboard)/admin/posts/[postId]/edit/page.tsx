import type { Metadata } from "next";

import { PostEditorPage } from "@/features/posts/components/post-editor-page";

export const instant = false;

export const metadata: Metadata = {
  title: "Edit post",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function Page({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  return <PostEditorPage postId={postId} />;
}
