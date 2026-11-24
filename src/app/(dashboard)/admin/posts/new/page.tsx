import type { Metadata } from "next";

import { PostEditorPage } from "@/features/posts/components/post-editor-page";

export const instant = false;

export const metadata: Metadata = {
  title: "New post",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <PostEditorPage />;
}
