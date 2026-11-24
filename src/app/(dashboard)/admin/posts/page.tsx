import type { Metadata } from "next";

import { PostsListPage } from "@/features/posts/components/posts-list-page";

export const instant = false;

export const metadata: Metadata = {
  title: "Posts",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <PostsListPage />;
}
