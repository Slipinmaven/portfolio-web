import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { API_BASE_URL } from "@/lib/api/api-url";
import { getCachedPublicSiteSettings } from "@/features/site-settings/api/public-site-settings";
import { getPublicSiteSettings } from "@/features/site-settings/api/site-settings-api";

export const instant = false;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  "use cache";
  cacheLife("minutes");
  const siteSettings = await getPublicSiteSettings({});
  const metadata: Metadata = {
    title: {
      default: siteSettings.site_name,
      template: siteSettings.title_template
        .replace(/\{title\}/g, "%s")
        .replace(/\{site_name\}/g, siteSettings.site_name),
    },
    description:
      siteSettings.default_description ??
      "A personal portfolio and content management workspace.",
  };
  if (siteSettings.favicon_media_id) {
    metadata.icons = {
      icon: new URL(
        `/api/v1/media/${siteSettings.favicon_media_id}/content`,
        `${API_BASE_URL}/`,
      ).toString(),
    };
  }
  if (siteSettings.default_social_image_media_id) {
    metadata.openGraph = {
      images: [
        new URL(
          `/api/v1/media/${siteSettings.default_social_image_media_id}/content`,
          `${API_BASE_URL}/`,
        ).toString(),
      ],
    };
  }
  return metadata;
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const siteSettings = await getCachedPublicSiteSettings();
  return (
    <html
      lang={siteSettings.language_code}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
