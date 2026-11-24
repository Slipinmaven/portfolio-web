import type { SiteLinkPlatform } from "@/features/site-settings/api/site-settings-api";

type DestinationField = {
  label: string;
  placeholder: string;
  help: string;
  inputMode?: "email" | "tel";
};

export const SITE_LINK_DESTINATION_FIELDS: Record<
  SiteLinkPlatform,
  DestinationField
> = {
  GITHUB: {
    label: "Username or profile URL",
    placeholder: "octocat",
    help: "Enter your username or paste a profile URL.",
  },
  LINKEDIN: {
    label: "Profile name or URL",
    placeholder: "your-profile-name",
    help: "Enter your profile name or paste a profile URL.",
  },
  X: {
    label: "Username or profile URL",
    placeholder: "@username",
    help: "Enter your @handle or paste a profile URL.",
  },
  YOUTUBE: {
    label: "Channel handle or URL",
    placeholder: "@yourchannel",
    help: "Enter your @handle or paste a channel URL.",
  },
  TIKTOK: {
    label: "Username or profile URL",
    placeholder: "@username",
    help: "Enter your @handle or paste a profile URL.",
  },
  INSTAGRAM: {
    label: "Username or profile URL",
    placeholder: "username",
    help: "Enter your username or paste a profile URL.",
  },
  BLUESKY: {
    label: "Handle or profile URL",
    placeholder: "name.bsky.social",
    help: "Enter your handle or paste a profile URL.",
  },
  MASTODON: {
    label: "Mastodon handle or profile URL",
    placeholder: "@name@mastodon.social",
    help: "Enter @username@server or paste your profile URL.",
  },
  EMAIL: {
    label: "Email address",
    placeholder: "you@example.com",
    help: "Enter the address only; the mail link is created automatically.",
    inputMode: "email",
  },
  WHATSAPP: {
    label: "WhatsApp number",
    placeholder: "+254 712 345 678",
    help: "Include the country code. Spaces, parentheses, and + are okay.",
    inputMode: "tel",
  },
  OTHER: {
    label: "Website address",
    placeholder: "example.com",
    help: "Enter a domain or paste a full HTTPS URL.",
  },
};

const PROFILE_HOSTS: Partial<Record<SiteLinkPlatform, string[]>> = {
  GITHUB: ["github.com"],
  LINKEDIN: ["linkedin.com"],
  X: ["x.com", "twitter.com"],
  YOUTUBE: ["youtube.com", "youtu.be"],
  TIKTOK: ["tiktok.com"],
  INSTAGRAM: ["instagram.com"],
  BLUESKY: ["bsky.app"],
};

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function siteLinkDestinationFromStoredUrl(
  platform: SiteLinkPlatform,
  url: string,
): string {
  if (platform === "EMAIL") {
    return url.replace(/^mailto:/i, "");
  }

  const parsed = parseUrl(url);
  if (!parsed || parsed.protocol !== "https:" || parsed.search || parsed.hash) {
    return url;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const segments = parsed.pathname.split("/").filter(Boolean);

  if (platform === "WHATSAPP" && host === "wa.me") {
    const number = segments[0];
    if (segments.length === 1 && number && /^[1-9]\d{6,14}$/.test(number)) {
      return `+${number}`;
    }
  }

  if (platform === "GITHUB" && host === "github.com" && segments.length === 1) {
    return segments[0];
  }

  if (
    platform === "LINKEDIN" &&
    host === "linkedin.com" &&
    segments.length === 2 &&
    segments[0] === "in"
  ) {
    return segments[1];
  }

  if (
    (platform === "X" && ["x.com", "twitter.com"].includes(host)) &&
    segments.length === 1
  ) {
    return `@${segments[0]}`;
  }

  if (
    platform === "YOUTUBE" &&
    host === "youtube.com" &&
    segments.length === 1 &&
    segments[0].startsWith("@")
  ) {
    return segments[0];
  }

  if (
    platform === "TIKTOK" &&
    host === "tiktok.com" &&
    segments.length === 1 &&
    segments[0].startsWith("@")
  ) {
    return segments[0];
  }

  if (
    platform === "INSTAGRAM" &&
    host === "instagram.com" &&
    segments.length === 1
  ) {
    return segments[0];
  }

  if (
    platform === "BLUESKY" &&
    host === "bsky.app" &&
    segments.length === 2 &&
    segments[0] === "profile"
  ) {
    return segments[1];
  }

  if (
    platform === "MASTODON" &&
    segments.length === 1 &&
    /^@[^@]+$/.test(segments[0])
  ) {
    return `${segments[0]}@${parsed.host}`;
  }

  return url;
}

function fullHttpsUrl(value: string): string {
  const parsed = parseUrl(value);
  if (!parsed || parsed.protocol !== "https:" || !parsed.hostname) {
    throw new Error("Enter a valid HTTPS profile URL.");
  }
  return value;
}

function profileHandle(value: string, platform: SiteLinkPlatform): string {
  let handle = value.trim();
  if (platform === "LINKEDIN" && /^in\//i.test(handle)) {
    handle = handle.slice(3);
  }
  handle = handle.replace(/^@/, "");
  if (!handle || /[/?#\s]/.test(handle)) {
    throw new Error(
      `Enter a ${PLATFORM_LABELS[platform]} username only, or paste its profile URL.`,
    );
  }
  return encodeURIComponent(handle);
}

const PLATFORM_LABELS: Record<SiteLinkPlatform, string> = {
  GITHUB: "GitHub",
  LINKEDIN: "LinkedIn",
  X: "X",
  YOUTUBE: "YouTube",
  TIKTOK: "TikTok",
  INSTAGRAM: "Instagram",
  BLUESKY: "Bluesky",
  MASTODON: "Mastodon",
  EMAIL: "email",
  WHATSAPP: "WhatsApp",
  OTHER: "website",
};

function bareProfileUrl(
  value: string,
  platform: SiteLinkPlatform,
): string | null {
  const firstPathSegment = value.split(/[/?#]/, 1)[0].toLowerCase();
  const host = firstPathSegment.replace(/^www\./, "");
  const hasPath = value.includes("/");
  const knownPlatformHost = PROFILE_HOSTS[platform]?.includes(host) ?? false;
  const isCustomInstanceUrl =
    (platform === "MASTODON" || platform === "OTHER") && host.includes(".");
  const isWebsiteUrl = host.includes(".");

  if (
    (hasPath && isWebsiteUrl && (knownPlatformHost || isCustomInstanceUrl)) ||
    (platform === "OTHER" && isWebsiteUrl && !hasPath)
  ) {
    return `https://${value}`;
  }

  return null;
}

function mastodonProfileUrl(value: string): string {
  const match = value.match(/^@?([^@\s/]+)@([^@\s/]+)$/);
  if (!match) {
    throw new Error(
      "Enter a Mastodon handle as @username@server, or paste its profile URL.",
    );
  }

  const [, username, server] = match;
  const parsedServer = parseUrl(`https://${server}`);
  if (
    !parsedServer ||
    !parsedServer.hostname.includes(".") ||
    parsedServer.pathname !== "/" ||
    parsedServer.search ||
    parsedServer.hash
  ) {
    throw new Error("Enter a valid Mastodon server in @username@server.");
  }

  return `${parsedServer.origin}/@${encodeURIComponent(username)}`;
}

export function siteLinkDestinationForSave(
  platform: SiteLinkPlatform,
  destination: string,
): string {
  const value = destination.trim();
  if (!value) return value;

  if (platform === "EMAIL") {
    const address = value.replace(/^mailto:/i, "");
    if (!/^[^@\s]+@[^@\s]+$/.test(address)) {
      throw new Error("Enter a valid email address, such as you@example.com.");
    }
    return `mailto:${address}`;
  }

  if (platform === "WHATSAPP") {
    const whatsappUrl = /^(?:https?:\/\/)?(?:www\.)?wa\.me\//i.test(value)
      ? value.replace(
          /^(?:https?:\/\/)?(?:www\.)?wa\.me\//i,
          "https://wa.me/",
        )
      : null;

    if (whatsappUrl) {
      const parsed = parseUrl(whatsappUrl);
      const number = parsed?.pathname.match(/^\/([1-9]\d{6,14})$/)?.[1];
      if (
        !parsed ||
        parsed.protocol !== "https:" ||
        parsed.host.toLowerCase() !== "wa.me" ||
        !number ||
        parsed.hash
      ) {
        throw new Error(
          "Enter a WhatsApp number with country code, or a valid wa.me link.",
        );
      }
      return `https://wa.me/${number}${parsed.search}`;
    }

    const formattedNumber = value.replace(/[\s().-]/g, "");
    if (!/^\+?\d+$/.test(formattedNumber)) {
      throw new Error(
        "Enter a WhatsApp number with country code, such as +254 712 345 678.",
      );
    }
    const number = formattedNumber.replace(/^\+/, "");
    if (!/^[1-9]\d{6,14}$/.test(number)) {
      throw new Error(
        "Enter the full international WhatsApp number, including its country code.",
      );
    }
    return `https://wa.me/${number}`;
  }

  if (/^https?:\/\//i.test(value)) {
    return fullHttpsUrl(value);
  }
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(value)) {
    throw new Error("Profile links must use HTTPS.");
  }

  const bareUrl = bareProfileUrl(value, platform);
  if (bareUrl) {
    return fullHttpsUrl(bareUrl);
  }

  if (platform === "MASTODON") {
    return mastodonProfileUrl(value);
  }

  if (platform === "OTHER") {
    throw new Error("Enter a website domain or a full HTTPS URL.");
  }

  const handle = profileHandle(value, platform);
  switch (platform) {
    case "GITHUB":
      return `https://github.com/${handle}`;
    case "LINKEDIN":
      return `https://www.linkedin.com/in/${handle}`;
    case "X":
      return `https://x.com/${handle}`;
    case "YOUTUBE":
      return `https://www.youtube.com/@${handle}`;
    case "TIKTOK":
      return `https://www.tiktok.com/@${handle}`;
    case "INSTAGRAM":
      return `https://www.instagram.com/${handle}`;
    case "BLUESKY":
      return `https://bsky.app/profile/${handle}`;
    default: {
      const exhaustivePlatform: never = platform;
      return exhaustivePlatform;
    }
  }
}
