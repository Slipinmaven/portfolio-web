import { API_BASE_URL } from "@/lib/api/api-url";
import { authenticatedRequest } from "@/lib/api/authenticated-request";

export const MEDIA_ENDPOINT_NOT_FOUND_MESSAGE =
  "The media service route wasn't found on this backend. Check that it is running the current project version, then try again.";

export type MediaKind = "IMAGE" | "DOCUMENT" | "VIDEO";

export type MediaLink = {
  id: string;
  url: string;
  label: string | null;
  display_order: number;
  created_at: string;
};

export type MediaItem = {
  id: string;
  kind: MediaKind;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  checksum_sha256: string;
  title: string | null;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
  file_url: string;
  poster_url: string | null;
  links: MediaLink[];
  duplicate_checksum: boolean;
  duplicate_media_id: string | null;
};

export type MediaUsage =
  | {
      usage_type: "PROJECT";
      project_id: string;
      project_title: string;
      project_slug: string;
      role: "COVER" | "GALLERY" | "INLINE" | "ATTACHMENT";
      display_order: number;
      caption: string | null;
      setting: null;
    }
  | {
      usage_type: "SITE_SETTINGS";
      project_id: null;
      project_title: null;
      project_slug: null;
      role: null;
      display_order: null;
      caption: null;
      setting: string;
    };

export type MediaListResponse = {
  media: MediaItem[];
  total: number;
  offset: number;
  limit: number;
};

export type MediaStorageCategory = {
  kind: MediaKind;
  item_count: number;
  size_bytes: number;
};

export type MediaStorageFile = {
  id: string;
  kind: MediaKind;
  original_filename: string;
  title: string | null;
  size_bytes: number;
};

type MediaStorageSummaryFields = {
  item_count: number;
  size_bytes: number;
  categories: MediaStorageCategory[];
  largest_files: MediaStorageFile[];
  warning_threshold_free_percent: number;
};

export type MediaStorageSummary =
  | (MediaStorageSummaryFields & {
      storage_provider: "local";
      filesystem_total_bytes: number;
      filesystem_free_bytes: number;
      filesystem_free_percent: number;
      is_low_storage: boolean;
    })
  | (MediaStorageSummaryFields & {
      storage_provider: "supabase";
      filesystem_total_bytes: null;
      filesystem_free_bytes: null;
      filesystem_free_percent: null;
      is_low_storage: false;
    });

export type MediaUploadJob =
  | { status: "PROCESSING"; media: null }
  | { status: "SUCCEEDED"; media: MediaItem }
  | { status: "FAILED"; media: null };

const pendingUploadStoragePrefix = "portfolio.pending-media-upload.";
const uploadIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const mediaKinds: ReadonlySet<string> = new Set([
  "IMAGE",
  "DOCUMENT",
  "VIDEO",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isMediaUsage(value: unknown): value is MediaUsage {
  if (!isRecord(value)) return false;
  if (value.usage_type === "SITE_SETTINGS") {
    return typeof value.setting === "string";
  }
  return (
    value.usage_type === "PROJECT" &&
    typeof value.project_id === "string" &&
    typeof value.project_title === "string" &&
    typeof value.project_slug === "string" &&
    (value.role === "COVER" ||
      value.role === "GALLERY" ||
      value.role === "INLINE" ||
      value.role === "ATTACHMENT") &&
    typeof value.display_order === "number" &&
    Number.isInteger(value.display_order) &&
    isNullableString(value.caption)
  );
}

function isMediaLink(value: unknown): value is MediaLink {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.url === "string" &&
    isNullableString(value.label) &&
    typeof value.display_order === "number" &&
    Number.isInteger(value.display_order) &&
    typeof value.created_at === "string"
  );
}

function isMediaItem(value: unknown): value is MediaItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.kind === "string" &&
    mediaKinds.has(value.kind) &&
    typeof value.original_filename === "string" &&
    typeof value.mime_type === "string" &&
    typeof value.size_bytes === "number" &&
    Number.isInteger(value.size_bytes) &&
    value.size_bytes > 0 &&
    typeof value.checksum_sha256 === "string" &&
    isNullableString(value.title) &&
    isNullableString(value.alt_text) &&
    (value.width === null || typeof value.width === "number") &&
    (value.height === null || typeof value.height === "number") &&
    (value.duration_seconds === null ||
      typeof value.duration_seconds === "number") &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string" &&
    typeof value.file_url === "string" &&
    isNullableString(value.poster_url) &&
    Array.isArray(value.links) &&
    value.links.every(isMediaLink) &&
    typeof value.duplicate_checksum === "boolean" &&
    isNullableString(value.duplicate_media_id)
  );
}

function isMediaListResponse(value: unknown): value is MediaListResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.media) &&
    value.media.every(isMediaItem) &&
    typeof value.total === "number" &&
    Number.isInteger(value.total) &&
    value.total >= 0 &&
    typeof value.offset === "number" &&
    Number.isInteger(value.offset) &&
    typeof value.limit === "number" &&
    Number.isInteger(value.limit)
  );
}

function isMediaStorageCategory(value: unknown): value is MediaStorageCategory {
  return (
    isRecord(value) &&
    typeof value.kind === "string" &&
    mediaKinds.has(value.kind) &&
    typeof value.item_count === "number" &&
    Number.isInteger(value.item_count) &&
    value.item_count >= 0 &&
    typeof value.size_bytes === "number" &&
    Number.isInteger(value.size_bytes) &&
    value.size_bytes >= 0
  );
}

function isMediaStorageFile(value: unknown): value is MediaStorageFile {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.kind === "string" &&
    mediaKinds.has(value.kind) &&
    typeof value.original_filename === "string" &&
    isNullableString(value.title) &&
    typeof value.size_bytes === "number" &&
    Number.isInteger(value.size_bytes) &&
    value.size_bytes >= 0
  );
}

function isMediaStorageSummary(value: unknown): value is MediaStorageSummary {
  const usesLocalStorage =
    isRecord(value) && value.storage_provider === "local";
  const usesSupabaseStorage =
    isRecord(value) && value.storage_provider === "supabase";
  if (
    !isRecord(value) ||
    (!usesLocalStorage && !usesSupabaseStorage) ||
    typeof value.item_count !== "number" ||
    !Number.isInteger(value.item_count) ||
    value.item_count < 0 ||
    typeof value.size_bytes !== "number" ||
    !Number.isInteger(value.size_bytes) ||
    value.size_bytes < 0 ||
    (usesLocalStorage &&
      (typeof value.filesystem_total_bytes !== "number" ||
        !Number.isInteger(value.filesystem_total_bytes) ||
        value.filesystem_total_bytes <= 0 ||
        typeof value.filesystem_free_bytes !== "number" ||
        !Number.isInteger(value.filesystem_free_bytes) ||
        value.filesystem_free_bytes < 0 ||
        value.filesystem_free_bytes > value.filesystem_total_bytes ||
        typeof value.filesystem_free_percent !== "number" ||
        !Number.isFinite(value.filesystem_free_percent) ||
        value.filesystem_free_percent < 0 ||
        value.filesystem_free_percent > 100)) ||
    (usesSupabaseStorage &&
      (value.filesystem_total_bytes !== null ||
        value.filesystem_free_bytes !== null ||
        value.filesystem_free_percent !== null ||
        value.is_low_storage !== false)) ||
    typeof value.warning_threshold_free_percent !== "number" ||
    !Number.isInteger(value.warning_threshold_free_percent) ||
    value.warning_threshold_free_percent < 1 ||
    value.warning_threshold_free_percent > 99 ||
    typeof value.is_low_storage !== "boolean" ||
    !Array.isArray(value.categories) ||
    !Array.isArray(value.largest_files)
  ) {
    return false;
  }

  const categories = value.categories.filter(isMediaStorageCategory);
  const largestFiles = value.largest_files.filter(isMediaStorageFile);
  return (
    categories.length === value.categories.length &&
    largestFiles.length === value.largest_files.length &&
    categories.reduce((total, category) => total + category.item_count, 0) ===
      value.item_count &&
    categories.reduce((total, category) => total + category.size_bytes, 0) ===
      value.size_bytes
  );
}

function assertMediaItem(value: unknown): MediaItem {
  if (!isMediaItem(value)) {
    throw new Error("The media service returned an invalid response.");
  }
  return value;
}

function isMediaUploadJob(value: unknown): value is MediaUploadJob {
  if (!isRecord(value)) return false;
  if (value.status === "PROCESSING" || value.status === "FAILED") {
    return value.media === null;
  }
  return value.status === "SUCCEEDED" && isMediaItem(value.media);
}

export function rememberPendingMediaUpload(uploadId: string): void {
  window.localStorage.setItem(
    `${pendingUploadStoragePrefix}${uploadId}`,
    "pending",
  );
}

export function listPendingMediaUploads(): string[] {
  const uploadIds: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(pendingUploadStoragePrefix)) continue;
    const uploadId = key.slice(pendingUploadStoragePrefix.length);
    if (uploadIdPattern.test(uploadId)) uploadIds.push(uploadId);
  }
  return uploadIds;
}

export function forgetPendingMediaUpload(uploadId: string): void {
  window.localStorage.removeItem(`${pendingUploadStoragePrefix}${uploadId}`);
}

export function mediaAssetUrl(path: string): string {
  return new URL(path, `${API_BASE_URL}/`).toString();
}

export async function listManagedMedia({
  offset = 0,
  limit = 50,
  kind,
  query,
  unusedOnly = false,
}: {
  offset?: number;
  limit?: number;
  kind?: MediaKind;
  query?: string;
  unusedOnly?: boolean;
} = {}): Promise<MediaListResponse> {
  const search = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  if (kind) search.set("kind", kind);
  if (query?.trim()) search.set("query", query.trim());
  if (unusedOnly) search.set("unused_only", "true");

  const response = await authenticatedRequest(
    `/api/v1/media/admin?${search.toString()}`,
  );
  const body: unknown = await response.json();
  if (!isMediaListResponse(body)) {
    throw new Error("The media service returned an invalid response.");
  }
  return body;
}

export async function getMediaStorageSummary(): Promise<MediaStorageSummary> {
  const response = await authenticatedRequest(
    "/api/v1/media/admin/storage-usage",
  );
  const body: unknown = await response.json();
  if (!isMediaStorageSummary(body)) {
    throw new Error("The media service returned an invalid storage summary.");
  }
  return body;
}

export async function getManagedMedia(mediaId: string): Promise<MediaItem> {
  const response = await authenticatedRequest(
    `/api/v1/media/admin/${encodeURIComponent(mediaId)}`,
  );
  return assertMediaItem(await response.json());
}

export async function listAllManagedMedia(): Promise<MediaItem[]> {
  const items: MediaItem[] = [];
  let offset = 0;
  let total = 0;
  do {
    const page = await listManagedMedia({ offset, limit: 100 });
    items.push(...page.media);
    total = page.total;
    if (page.media.length === 0 && offset < total) {
      throw new Error("The media service returned an incomplete list.");
    }
    offset += page.media.length;
  } while (offset < total);
  return items;
}

export async function uploadMedia(input: {
  uploadId: string;
  file: File;
  title: string;
  altText: string;
  onProgress?: (percent: number | null) => void;
}): Promise<MediaItem> {
  const body = new FormData();
  body.set("file", input.file);
  body.set("upload_id", input.uploadId);
  if (input.title.trim()) body.set("title", input.title.trim());
  if (input.altText.trim()) body.set("alt_text", input.altText.trim());

  const response = await authenticatedRequest("/api/v1/media/admin/upload", {
    method: "POST",
    body,
  }, input.onProgress);
  if (response.status === 202) {
    while (true) {
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
      const job = await getMediaUploadJob(input.uploadId);
      if (job.status === "SUCCEEDED") return job.media;
      if (job.status === "FAILED") {
        throw new Error("The upload failed while being processed.");
      }
    }
  }
  return assertMediaItem(await response.json());
}

export async function getMediaUploadJob(
  uploadId: string,
): Promise<MediaUploadJob> {
  const response = await authenticatedRequest(
    `/api/v1/media/admin/upload-jobs/${encodeURIComponent(uploadId)}`,
  );
  const body: unknown = await response.json();
  if (!isMediaUploadJob(body)) {
    throw new Error("The media service returned an invalid upload status.");
  }
  return body;
}

export async function updateMedia(
  mediaId: string,
  input: {
    title?: string | null;
    alt_text?: string | null;
    links?: Array<{
      url: string;
      label: string | null;
      display_order: number;
    }>;
  },
): Promise<MediaItem> {
  const response = await authenticatedRequest(
    `/api/v1/media/admin/${encodeURIComponent(mediaId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return assertMediaItem(await response.json());
}

export async function deleteMedia(mediaId: string): Promise<void> {
  await authenticatedRequest(
    `/api/v1/media/admin/${encodeURIComponent(mediaId)}`,
    { method: "DELETE" },
  );
}

export async function listMediaUsages(mediaId: string): Promise<MediaUsage[]> {
  const response = await authenticatedRequest(
    `/api/v1/media/admin/${encodeURIComponent(mediaId)}/usages`,
  );
  const body: unknown = await response.json();
  if (
    !isRecord(body) ||
    !Array.isArray(body.usages) ||
    !body.usages.every(isMediaUsage)
  ) {
    throw new Error("The media service returned an invalid usage response.");
  }
  return body.usages;
}
