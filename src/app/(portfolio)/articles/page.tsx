import { Suspense } from "react";
import type { Metadata } from "next";

import { PublicPostListPage } from "@/features/posts/components/public-post-pages";

export const metadata: Metadata = {
  title: "Articles",
  description: "Long-form articles about the work, tools, and ideas behind my projects.",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <p className="py-24 text-center text-sm text-muted" role="status">
          Loading articles…
        </p>
      }
    >
      <PublicPostListPage kind="ARTICLE" />
    </Suspense>
  );
}
