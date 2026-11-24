import { authenticatedRequest } from "@/lib/api/authenticated-request";

export type ProjectStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type ProjectDevelopmentStatus =
  | "PLANNING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ON_HOLD"
  | "CANCELLED";

export type ProjectSummary = {
  id: string;
  title: string;
  slug: string;
  github_url: string | null;
  demo_url: string | null;
  short_description: string;
  overview: string | null;
  status: ProjectStatus;
  development_status: ProjectDevelopmentStatus;
  published_at: string | null;
  archived_at: string | null;
  display_order: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
};

export type ProjectDetail = ProjectSummary & {
  category_ids: string[];
  tag_ids: string[];
  resource_ids: string[];
};

export type ProjectWriteInput = {
  title: string;
  slug: string;
  short_description: string;
  development_status: ProjectDevelopmentStatus;
  display_order: number;
  github_url: string | null;
  demo_url: string | null;
  overview: string | null;
  status: ProjectStatus;
  published_at: string | null;
  archived_at: string | null;
  is_featured: boolean;
  category_ids: string[];
  tag_ids: string[];
  resource_ids: string[];
};

export type ProjectListResponse = {
  projects: ProjectSummary[];
  total: number;
  offset: number;
  limit: number;
};

const projectStatuses: ReadonlySet<string> = new Set([
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);
const developmentStatuses: ReadonlySet<string> = new Set([
  "PLANNING",
  "IN_PROGRESS",
  "COMPLETED",
  "ON_HOLD",
  "CANCELLED",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function isProjectSummary(value: unknown): value is ProjectSummary {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.slug === "string" &&
    isNullableString(value.github_url) &&
    isNullableString(value.demo_url) &&
    typeof value.short_description === "string" &&
    isNullableString(value.overview) &&
    typeof value.status === "string" &&
    projectStatuses.has(value.status) &&
    typeof value.development_status === "string" &&
    developmentStatuses.has(value.development_status) &&
    isNullableString(value.published_at) &&
    isNullableString(value.archived_at) &&
    typeof value.display_order === "number" &&
    Number.isInteger(value.display_order) &&
    value.display_order >= 0 &&
    typeof value.is_featured === "boolean" &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string"
  );
}

function isProjectDetail(value: unknown): value is ProjectDetail {
  if (!isRecord(value)) return false;
  const categoryIds = value.category_ids;
  const tagIds = value.tag_ids;
  const resourceIds = value.resource_ids;
  return (
    isProjectSummary(value) &&
    Array.isArray(categoryIds) &&
    categoryIds.every((id: unknown) => typeof id === "string") &&
    Array.isArray(tagIds) &&
    tagIds.every((id: unknown) => typeof id === "string") &&
    Array.isArray(resourceIds) &&
    resourceIds.every((id: unknown) => typeof id === "string")
  );
}

function isProjectListResponse(value: unknown): value is ProjectListResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.projects) &&
    value.projects.every(isProjectSummary) &&
    typeof value.total === "number" &&
    Number.isInteger(value.total) &&
    value.total >= 0 &&
    typeof value.offset === "number" &&
    Number.isInteger(value.offset) &&
    value.offset >= 0 &&
    typeof value.limit === "number" &&
    Number.isInteger(value.limit) &&
    value.limit > 0
  );
}

async function readProjectResponse(response: Response): Promise<ProjectDetail> {
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new Error("The project service returned an invalid response.", {
      cause: error,
    });
  }
  if (!isProjectDetail(body)) {
    throw new Error("The project service returned an invalid response.");
  }
  return body;
}

export async function listManagedProjects(
  offset: number,
  limit: number,
): Promise<ProjectListResponse> {
  const query = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  const response = await authenticatedRequest(
    `/api/v1/projects/admin?${query.toString()}`,
  );

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new Error("The project service returned an invalid response.", {
      cause: error,
    });
  }
  if (!isProjectListResponse(body)) {
    throw new Error("The project service returned an invalid response.");
  }
  return body;
}

export async function listAllManagedProjects(): Promise<ProjectSummary[]> {
  const projects: ProjectSummary[] = [];
  let offset = 0;
  let total = 0;
  do {
    const page = await listManagedProjects(offset, 100);
    projects.push(...page.projects);
    total = page.total;
    if (page.projects.length === 0 && offset < total) {
      throw new Error("The project service returned an incomplete list.");
    }
    offset += page.projects.length;
  } while (offset < total);
  return projects;
}

export async function getNextProjectDisplayOrder(): Promise<number> {
  let offset = 0;
  let total = 0;
  let highestOrder = -1;

  do {
    const page = await listManagedProjects(offset, 100);
    total = page.total;
    for (const project of page.projects) {
      highestOrder = Math.max(highestOrder, project.display_order);
    }
    if (page.projects.length === 0) {
      if (offset < total) {
        throw new Error("The project service returned an incomplete list.");
      }
      break;
    }
    offset += page.projects.length;
  } while (offset < total);

  return highestOrder + 1;
}

export async function getManagedProject(
  projectId: string,
): Promise<ProjectDetail> {
  const response = await authenticatedRequest(
    `/api/v1/projects/admin/${encodeURIComponent(projectId)}`,
  );
  return readProjectResponse(response);
}

export async function createProject(
  input: ProjectWriteInput,
): Promise<ProjectDetail> {
  const response = await authenticatedRequest("/api/v1/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readProjectResponse(response);
}

export async function updateProject(
  projectId: string,
  input: ProjectWriteInput,
): Promise<ProjectDetail> {
  const response = await authenticatedRequest(
    `/api/v1/projects/admin/${encodeURIComponent(projectId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return readProjectResponse(response);
}
