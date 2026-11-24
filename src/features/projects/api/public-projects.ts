import { API_BASE_URL } from "@/lib/api/api-url";

import {
  isProjectSummary,
  type ProjectListResponse,
  type ProjectSummary,
} from "@/features/projects/api/projects-api";
import {
  isPublicResourceLink,
  type PublicResourceLink,
} from "@/features/resources/api/resources-api";

export type PublicProjectCover = {
  media_id: string;
  title: string | null;
  alt_text: string | null;
  file_url: string;
};

export type PublicProjectSummary = ProjectSummary & {
  status: "PUBLISHED";
  cover_media: PublicProjectCover | null;
};

export type PublicProjectListResponse = Omit<ProjectListResponse, "projects"> & {
  projects: PublicProjectSummary[];
};

export type PublicProjectMedia = {
  project_id: string;
  media_id: string;
  role: "COVER" | "GALLERY" | "INLINE" | "ATTACHMENT";
  display_order: number;
  caption: string | null;
  original_filename: string;
  kind: "IMAGE" | "DOCUMENT" | "VIDEO";
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

export type PublicProjectTag = {
  id: string;
  name: string;
  slug: string;
};

export type PublicProject = ProjectSummary & {
  status: "PUBLISHED";
  media: PublicProjectMedia[];
  overview_html: string;
  tags: PublicProjectTag[];
  resource_ids: string[];
  resources: PublicResourceLink[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isPublicProjectTag(value: unknown): value is PublicProjectTag {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.slug === "string"
  );
}

function isPublicProjectCover(value: unknown): value is PublicProjectCover {
  return (
    isRecord(value) &&
    typeof value.media_id === "string" &&
    isNullableString(value.title) &&
    isNullableString(value.alt_text) &&
    typeof value.file_url === "string"
  );
}

function isPublicProjectMedia(value: unknown): value is PublicProjectMedia {
  return (
    isRecord(value) &&
    typeof value.project_id === "string" &&
    typeof value.media_id === "string" &&
    (value.role === "COVER" ||
      value.role === "GALLERY" ||
      value.role === "INLINE" ||
      value.role === "ATTACHMENT") &&
    typeof value.display_order === "number" &&
    Number.isInteger(value.display_order) &&
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
    Array.isArray(value.links) &&
    value.links.every(
      (link: unknown) =>
        isRecord(link) &&
        typeof link.url === "string" &&
        isNullableString(link.label) &&
        typeof link.display_order === "number" &&
        Number.isInteger(link.display_order),
    )
  );
}

function isPublicProject(value: unknown): value is PublicProject {
  if (!isRecord(value)) return false;
  const fields = value;
  return (
    isProjectSummary(value) &&
    fields.status === "PUBLISHED" &&
    typeof fields.overview_html === "string" &&
    Array.isArray(fields.tags) &&
    fields.tags.every(isPublicProjectTag) &&
    Array.isArray(fields.media) &&
    fields.media.every(isPublicProjectMedia) &&
    Array.isArray(fields.resource_ids) &&
    fields.resource_ids.every((id: unknown) => typeof id === "string") &&
    Array.isArray(fields.resources) &&
    fields.resources.every(isPublicResourceLink)
  );
}

function isPublishedProjectSummary(
  value: unknown,
): value is PublicProjectSummary {
  if (!isRecord(value)) return false;
  const coverMedia = value.cover_media;
  return (
    isProjectSummary(value) &&
    value.status === "PUBLISHED" &&
    (coverMedia === null || isPublicProjectCover(coverMedia))
  );
}

export async function getPublishedProjects(
  offset: number,
  limit: number,
  categoryId?: string,
): Promise<PublicProjectListResponse> {
  const query = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  if (categoryId) query.set("category_id", categoryId);
  const response = await fetch(
    `${API_BASE_URL}/api/v1/projects?${query.toString()}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error("Published projects could not be loaded.");
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new Error("The project service returned an invalid response.", {
      cause: error,
    });
  }
  if (!isRecord(body)) {
    throw new Error("The project service returned an invalid response.");
  }
  const { projects, total, offset: responseOffset, limit: responseLimit } = body;
  if (
    !Array.isArray(projects) ||
    !projects.every(isPublishedProjectSummary) ||
    typeof total !== "number" ||
    !Number.isInteger(total) ||
    total < 0 ||
    typeof responseOffset !== "number" ||
    !Number.isInteger(responseOffset) ||
    responseOffset < 0 ||
    typeof responseLimit !== "number" ||
    !Number.isInteger(responseLimit) ||
    responseLimit < 1
  ) {
    throw new Error("The project service returned an invalid response.");
  }

  return {
    projects,
    total,
    offset: responseOffset,
    limit: responseLimit,
  };
}

export async function getPublishedProject(
  slug: string,
): Promise<PublicProject | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/projects/${encodeURIComponent(slug)}`,
    { cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error("The published project could not be loaded.");
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new Error("The project service returned an invalid response.", {
      cause: error,
    });
  }
  if (!isPublicProject(body)) {
    throw new Error("The project service returned an invalid response.");
  }
  return body;
}
