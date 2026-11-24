import { Suspense } from "react";
import type { Metadata } from "next";

import { PublicPostListPage } from "@/features/posts/components/public-post-pages";

export const metadata: Metadata = {
  title: "Notes",
  description: "Short technical notes and useful things I want to remember.",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <p className="py-24 text-center text-sm text-muted" role="status">
          Loading notes…
        </p>
      }
    >
      <PublicPostListPage kind="NOTE" />
    </Suspense>
  );
}
