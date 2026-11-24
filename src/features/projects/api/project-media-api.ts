import { authenticatedRequest } from "@/lib/api/authenticated-request";

import type { MediaKind } from "@/features/media/api/media-api";

export type ProjectMediaRole = "COVER" | "GALLERY" | "ATTACHMENT";
export type ProjectMediaAssociationRole = ProjectMediaRole | "INLINE";

export type ProjectMediaItem = {
  project_id: string;
  media_id: string;
  role: ProjectMediaAssociationRole;
  display_order: number;
  caption: string | null;
  original_filename: string;
  kind: MediaKind;
  title: string | null;
  alt_text: string | null;
  mime_type: string;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  file_url: string;
  poster_url: string | null;
  links: Array<{
    url: string;
    label: string | null;
    display_order: number;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isProjectMediaItem(value: unknown): value is ProjectMediaItem {
  return (
    isRecord(value) &&
    typeof value.project_id === "string" &&
    typeof value.media_id === "string" &&
    (value.role === "COVER" ||
      value.role === "GALLERY" ||
      value.role === "INLINE" ||
      value.role === "ATTACHMENT") &&
    typeof value.display_order === "number" &&
    isNullableString(value.caption) &&
    typeof value.original_filename === "string" &&
    (value.kind === "IMAGE" ||
      value.kind === "DOCUMENT" ||
      value.kind === "VIDEO") &&
    isNullableString(value.title) &&
    isNullableString(value.alt_text) &&
    typeof value.mime_type === "string" &&
    (value.width === null || typeof value.width === "number") &&
    (value.height === null || typeof value.height === "number") &&
    (value.duration_seconds === null ||
      typeof value.duration_seconds === "number") &&
    typeof value.file_url === "string" &&
    isNullableString(value.poster_url) &&
    Array.isArray(value.links)
  );
}

async function readProjectMediaList(response: Response): Promise<ProjectMediaItem[]> {
  const body: unknown = await response.json();
  if (
    !isRecord(body) ||
    !Array.isArray(body.media) ||
    !body.media.every(isProjectMediaItem)
  ) {
    throw new Error("The project media service returned an invalid response.");
  }
  return body.media;
}

export async function listProjectMedia(
  projectId: string,
): Promise<ProjectMediaItem[]> {
  const response = await authenticatedRequest(
    `/api/v1/projects/admin/${encodeURIComponent(projectId)}/media`,
  );
  return readProjectMediaList(response);
}

export async function addProjectMedia(
  projectId: string,
  input: {
    media_id: string;
    role: ProjectMediaRole;
    display_order: number;
    caption: string | null;
  },
): Promise<ProjectMediaItem> {
  const response = await authenticatedRequest(
    `/api/v1/projects/admin/${encodeURIComponent(projectId)}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  const body: unknown = await response.json();
  if (!isProjectMediaItem(body)) {
    throw new Error("The project media service returned an invalid response.");
  }
  return body;
}

export async function updateProjectMedia(
  projectId: string,
  item: ProjectMediaItem,
  input: { display_order?: number; caption?: string | null },
): Promise<ProjectMediaItem> {
  const response = await authenticatedRequest(
    `/api/v1/projects/admin/${encodeURIComponent(projectId)}/media/${encodeURIComponent(item.media_id)}/${item.role}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  const body: unknown = await response.json();
  if (!isProjectMediaItem(body)) {
    throw new Error("The project media service returned an invalid response.");
  }
  return body;
}

export async function reorderProjectMedia(
  projectId: string,
  role: ProjectMediaRole,
  mediaIds: string[],
): Promise<ProjectMediaItem[]> {
  const response = await authenticatedRequest(
    `/api/v1/projects/admin/${encodeURIComponent(projectId)}/media/order`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, media_ids: mediaIds }),
    },
  );
  return readProjectMediaList(response);
}

export async function removeProjectMedia(
  projectId: string,
  item: ProjectMediaItem,
): Promise<void> {
  await authenticatedRequest(
    `/api/v1/projects/admin/${encodeURIComponent(projectId)}/media/${encodeURIComponent(item.media_id)}/${item.role}`,
    { method: "DELETE" },
  );
}
