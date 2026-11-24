import type { Metadata } from "next";

import { getCachedPublicSiteSettings } from "@/features/site-settings/api/public-site-settings";
import { PortfolioLayout } from "@/features/portfolio/components/portfolio-layout";
import { getPublicNavigation } from "@/features/navigation/api/navigation-api";

export const instant = false;

export const metadata: Metadata = {
  title: "Home",
};

export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const siteSettings = await getCachedPublicSiteSettings();
  let navigation;
  try {
    navigation = await getPublicNavigation();
  } catch (error) {
    console.error("Could not load public navigation.", error);
    navigation = null;
  }
  return (
    <PortfolioLayout settings={siteSettings} navigation={navigation}>
      {children}
    </PortfolioLayout>
  );
}
