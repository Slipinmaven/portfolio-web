import type { Metadata } from "next";

import { MediaLibraryPage } from "@/features/media/components/media-library-page";

export const metadata: Metadata = {
  title: "Media library",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <MediaLibraryPage />;
}
