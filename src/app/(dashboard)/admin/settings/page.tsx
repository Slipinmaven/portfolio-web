import type { Metadata } from "next";

import { SiteSettingsPage } from "@/features/site-settings/components/site-settings-page";

export const instant = false;

export const metadata: Metadata = {
  title: "Site settings",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <SiteSettingsPage />;
}
