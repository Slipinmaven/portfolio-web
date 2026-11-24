import {
  faBluesky,
  faGithub,
  faInstagram,
  faLinkedinIn,
  faMastodon,
  faTiktok,
  faWhatsapp,
  faXTwitter,
  faYoutube,
} from "@fortawesome/free-brands-svg-icons";

import type { SiteLinkPlatform } from "@/features/site-settings/api/site-settings-api";

const PLATFORM_LABELS: Record<SiteLinkPlatform, string> = {
  GITHUB: "GitHub",
  LINKEDIN: "LinkedIn",
  X: "X",
  YOUTUBE: "YouTube",
  TIKTOK: "TikTok",
  INSTAGRAM: "Instagram",
  BLUESKY: "Bluesky",
  MASTODON: "Mastodon",
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  OTHER: "Other",
};

const PLATFORM_BRAND_COLORS: Partial<Record<SiteLinkPlatform, string>> = {
  GITHUB: "#181717",
  LINKEDIN: "#0A66C2",
  X: "#000000",
  YOUTUBE: "#FF0033",
  TIKTOK: "#000000",
  INSTAGRAM: "#E4405F",
  BLUESKY: "#0085FF",
  MASTODON: "#6364FF",
  WHATSAPP: "#25D366",
};

type BrandIconData = {
  icon: readonly [
    number,
    number,
    readonly string[],
    string,
    string | readonly string[],
  ];
};

const PLATFORM_BRAND_ICONS: Partial<
  Record<SiteLinkPlatform, BrandIconData>
> = {
  GITHUB: faGithub,
  LINKEDIN: faLinkedinIn,
  X: faXTwitter,
  YOUTUBE: faYoutube,
  TIKTOK: faTiktok,
  INSTAGRAM: faInstagram,
  BLUESKY: faBluesky,
  MASTODON: faMastodon,
  WHATSAPP: faWhatsapp,
};

export function siteLinkPlatformLabel(platform: SiteLinkPlatform): string {
  return PLATFORM_LABELS[platform];
}

export function SiteLinkIcon({
  platform,
  className,
  monochrome = false,
}: {
  platform: SiteLinkPlatform;
  className: string;
  monochrome?: boolean;
}) {
  const brandIcon = PLATFORM_BRAND_ICONS[platform];
  const pathData = brandIcon?.icon[4];
  const paths =
    typeof pathData === "string" ? [pathData] : pathData ?? [];

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill={brandIcon ? "currentColor" : "none"}
      focusable="false"
      stroke={brandIcon ? "none" : "currentColor"}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      style={
        brandIcon && !monochrome
          ? { color: PLATFORM_BRAND_COLORS[platform] }
          : undefined
      }
      viewBox={
        brandIcon
          ? `0 0 ${brandIcon.icon[0]} ${brandIcon.icon[1]}`
          : "0 0 24 24"
      }
    >
      {brandIcon ? (
        paths.map((path, index) => <path d={path} key={index} />)
      ) : platform === "EMAIL" ? (
        <>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
          <path d="m4.5 7 7.5 5.5L19.5 7" />
        </>
      ) : (
        <>
          <path d="M10 13.5a3 3 0 0 0 4.2 0l2.4-2.4a3 3 0 0 0-4.2-4.2l-1.3 1.3" />
          <path d="M14 10.5a3 3 0 0 0-4.2 0l-2.4 2.4a3 3 0 0 0 4.2 4.2l1.3-1.3" />
        </>
      )}
    </svg>
  );
}
