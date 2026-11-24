import { API_BASE_URL } from "@/lib/api/api-url";
import { authenticatedRequest } from "@/lib/api/authenticated-request";

export type SiteLinkPlatform =
  | "GITHUB"
  | "LINKEDIN"
  | "X"
  | "YOUTUBE"
  | "TIKTOK"
  | "INSTAGRAM"
  | "BLUESKY"
  | "MASTODON"
  | "EMAIL"
  | "WHATSAPP"
  | "OTHER";

export type SiteLink = {
  id: string;
  platform: SiteLinkPlatform;
  url: string;
  label: string | null;
  display_order: number;
  created_at: string;
};

export type SiteSettings = {
  site_name: string;
  tagline: string | null;
  owner_name: string;
  role_title: string | null;
  owner_bio: string | null;
  location: string | null;
  availability_note: string | null;
  language_code: string;
  title_template: string;
  default_description: string | null;
  logo_media_id: string | null;
  favicon_media_id: string | null;
  default_social_image_media_id: string | null;
  profile_image_media_id: string | null;
  links: SiteLink[];
  updated_at: string;
};

export type SiteSettingsInput = Omit<SiteSettings, "links" | "updated_at"> & {
  links: Array<{
    id?: string;
    platform: SiteLinkPlatform;
    url: string;
    label: string | null;
  }>;
};

const platforms: ReadonlySet<string> = new Set([
  "GITHUB",
  "LINKEDIN",
  "X",
  "YOUTUBE",
  "TIKTOK",
  "INSTAGRAM",
  "BLUESKY",
  "MASTODON",
  "EMAIL",
  "WHATSAPP",
  "OTHER",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isSiteLink(value: unknown): value is SiteLink {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.platform === "string" &&
    platforms.has(value.platform) &&
    typeof value.url === "string" &&
    isNullableString(value.label) &&
    typeof value.display_order === "number" &&
    Number.isInteger(value.display_order) &&
    typeof value.created_at === "string"
  );
}

export function isSiteSettings(value: unknown): value is SiteSettings {
  return (
    isRecord(value) &&
    typeof value.site_name === "string" &&
    isNullableString(value.tagline) &&
    typeof value.owner_name === "string" &&
    isNullableString(value.role_title) &&
    isNullableString(value.owner_bio) &&
    isNullableString(value.location) &&
    isNullableString(value.availability_note) &&
    typeof value.language_code === "string" &&
    typeof value.title_template === "string" &&
    isNullableString(value.default_description) &&
    isNullableString(value.logo_media_id) &&
    isNullableString(value.favicon_media_id) &&
    isNullableString(value.default_social_image_media_id) &&
    isNullableString(value.profile_image_media_id) &&
    Array.isArray(value.links) &&
    value.links.every(isSiteLink) &&
    typeof value.updated_at === "string"
  );
}

async function readSiteSettings(response: Response): Promise<SiteSettings> {
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new Error("The site settings service returned invalid JSON.", {
      cause: error,
    });
  }
  if (!isSiteSettings(body)) {
    throw new Error("The site settings service returned an invalid response.");
  }
  return body;
}

export async function getPublicSiteSettings(
  requestInit: Pick<RequestInit, "cache"> = { cache: "no-store" },
): Promise<SiteSettings> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/site-settings/public`,
    requestInit,
  );
  if (!response.ok) {
    throw new Error("The public site settings could not be loaded.");
  }
  return readSiteSettings(response);
}

export async function getManagedSiteSettings(): Promise<SiteSettings> {
  const response = await authenticatedRequest("/api/v1/site-settings/admin");
  return readSiteSettings(response);
}

export async function updateManagedSiteSettings(
  input: SiteSettingsInput,
): Promise<SiteSettings> {
  const response = await authenticatedRequest("/api/v1/site-settings/admin", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readSiteSettings(response);
}
