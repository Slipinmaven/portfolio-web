import type { Metadata } from "next";

import { TagManagementPage } from "@/features/taxonomy/components/tag-management-page";

export const instant = false;

export const metadata: Metadata = {
  title: "Tags",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <TagManagementPage />;
}
