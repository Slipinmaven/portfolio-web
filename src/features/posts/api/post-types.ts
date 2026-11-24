import type { Category } from "@/features/taxonomy/api/taxonomy-api";
import type { PublicResourceLink } from "@/features/resources/api/resources-api";
import { isPublicResourceLink } from "@/features/resources/api/resources-api";

export type PostKind = "ARTICLE" | "NOTE";
export type PostStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type PostAttachment = {
  media_id: string;
  title: string | null;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  file_url: string;
};

export type RelatedProject = {
  id: string;
  title: string;
  slug: string;
  short_description: string;
};

export type AdminPost = {
  id: string;
  kind: PostKind;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  status: PostStatus;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  category_ids: string[];
  project_ids: string[];
  resource_ids: string[];
  attachments: PostAttachment[];
};

export type AdminPostListResponse = {
  posts: AdminPost[];
  total: number;
  offset: number;
  limit: number;
};

export type PublicPostSummary = {
  id: string;
  kind: PostKind;
  title: string;
  slug: string;
  summary: string | null;
  published_at: string;
  categories: Pick<Category, "id" | "name" | "slug">[];
};

export type PublicPost = PublicPostSummary & {
  body_html: string;
  attachments: PostAttachment[];
  related_projects: RelatedProject[];
  resources: PublicResourceLink[];
};

export type PublicPostListResponse = {
  posts: PublicPostSummary[];
  total: number;
  offset: number;
  limit: number;
};

export type PostCreateInput = {
  kind: PostKind;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  category_ids: string[];
  attachment_media_ids: string[];
  project_ids: string[];
  resource_ids: string[];
};

export type PostUpdateInput = Omit<PostCreateInput, "kind"> & {
  status: PostStatus;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPostKind(value: unknown): value is PostKind {
  return value === "ARTICLE" || value === "NOTE";
}

function isPostStatus(value: unknown): value is PostStatus {
  return value === "DRAFT" || value === "PUBLISHED" || value === "ARCHIVED";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isCategorySummary(
  value: unknown,
): value is PublicPostSummary["categories"][number] {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.slug === "string"
  );
}

function isPostAttachment(value: unknown): value is PostAttachment {
  return (
    isRecord(value) &&
    typeof value.media_id === "string" &&
    isNullableString(value.title) &&
    typeof value.original_filename === "string" &&
    typeof value.mime_type === "string" &&
    typeof value.size_bytes === "number" &&
    Number.isInteger(value.size_bytes) &&
    value.size_bytes >= 0 &&
    typeof value.file_url === "string"
  );
}

function isRelatedProject(value: unknown): value is RelatedProject {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.slug === "string" &&
    typeof value.short_description === "string"
  );
}

export function isAdminPost(value: unknown): value is AdminPost {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isPostKind(value.kind) &&
    typeof value.title === "string" &&
    typeof value.slug === "string" &&
    isNullableString(value.summary) &&
    typeof value.body === "string" &&
    isPostStatus(value.status) &&
    isNullableString(value.published_at) &&
    isNullableString(value.archived_at) &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string" &&
    isStringArray(value.category_ids) &&
    isStringArray(value.project_ids) &&
    isStringArray(value.resource_ids) &&
    Array.isArray(value.attachments) &&
    value.attachments.every(isPostAttachment)
  );
}

export function isAdminPostListResponse(
  value: unknown,
): value is AdminPostListResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.posts) &&
    value.posts.every(isAdminPost) &&
    Number.isInteger(value.total) &&
    typeof value.total === "number" &&
    value.total >= 0 &&
    Number.isInteger(value.offset) &&
    typeof value.offset === "number" &&
    value.offset >= 0 &&
    Number.isInteger(value.limit) &&
    typeof value.limit === "number" &&
    value.limit > 0
  );
}

export function isPublicPostSummary(
  value: unknown,
): value is PublicPostSummary {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isPostKind(value.kind) &&
    typeof value.title === "string" &&
    typeof value.slug === "string" &&
    isNullableString(value.summary) &&
    typeof value.published_at === "string" &&
    Array.isArray(value.categories) &&
    value.categories.every(isCategorySummary)
  );
}

export function isPublicPost(value: unknown): value is PublicPost {
  return (
    isRecord(value) &&
    typeof value.body_html === "string" &&
    Array.isArray(value.attachments) &&
    value.attachments.every(isPostAttachment) &&
    Array.isArray(value.related_projects) &&
    value.related_projects.every(isRelatedProject) &&
    Array.isArray(value.resources) &&
    value.resources.every(isPublicResourceLink) &&
    isPublicPostSummary(value)
  );
}

export function isPublicPostListResponse(
  value: unknown,
): value is PublicPostListResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.posts) &&
    value.posts.every(isPublicPostSummary) &&
    Number.isInteger(value.total) &&
    typeof value.total === "number" &&
    value.total >= 0 &&
    Number.isInteger(value.offset) &&
    typeof value.offset === "number" &&
    value.offset >= 0 &&
    Number.isInteger(value.limit) &&
    typeof value.limit === "number" &&
    value.limit > 0
  );
}
