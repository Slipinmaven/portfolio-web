import type { Metadata } from "next";

import { PagesListPage } from "@/features/pages/components/pages-list-page";

export const instant = false;

export const metadata: Metadata = {
  title: "Pages",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <PagesListPage />;
}
