import type { Metadata } from "next";

import { CategoryManagementPage } from "@/features/taxonomy/components/category-management-page";

export const instant = false;

export const metadata: Metadata = {
  title: "Categories",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <CategoryManagementPage />;
}
