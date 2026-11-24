import { API_BASE_URL } from "@/lib/api/api-url";
import { authenticatedRequest } from "@/lib/api/authenticated-request";

export type ResourceType =
  | "ARTICLE"
  | "BOOK"
  | "COURSE"
  | "DOCS"
  | "TOOL"
  | "VIDEO"
  | "OTHER";
export type ResourceStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type ManagedResource = {
  id: string;
  title: string;
  url: string;
  resource_type: ResourceType;
  creator: string | null;
  summary: string | null;
  commentary: string | null;
  status: ResourceStatus;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ResourceInput = Pick<
  ManagedResource,
  "title" | "url" | "resource_type" | "creator" | "summary" | "commentary"
>;

export type PublicResource = ManagedResource & {
  status: "PUBLISHED";
  published_at: string;
  commentary_html: string;
};

export type PublicResourceLink = Pick<
  ManagedResource,
  "id" | "title" | "url" | "resource_type" | "creator" | "summary"
> & {
  commentary_html: string;
};

type ResourceListResponse<T> = {
  resources: T[];
  total: number;
  offset: number;
  limit: number;
};

const resourceTypes: ReadonlySet<string> = new Set([
  "ARTICLE",
  "BOOK",
  "COURSE",
  "DOCS",
  "TOOL",
  "VIDEO",
  "OTHER",
]);
const resourceStatuses: ReadonlySet<string> = new Set([
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isManagedResource(value: unknown): value is ManagedResource {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.url === "string" &&
    typeof value.resource_type === "string" &&
    resourceTypes.has(value.resource_type) &&
    isNullableString(value.creator) &&
    isNullableString(value.summary) &&
    isNullableString(value.commentary) &&
    typeof value.status === "string" &&
    resourceStatuses.has(value.status) &&
    isNullableString(value.published_at) &&
    isNullableString(value.archived_at) &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string"
  );
}

function isPublicResource(value: unknown): value is PublicResource {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.url === "string" &&
    typeof value.resource_type === "string" &&
    resourceTypes.has(value.resource_type) &&
    isNullableString(value.creator) &&
    isNullableString(value.summary) &&
    isNullableString(value.commentary) &&
    value.status === "PUBLISHED" &&
    typeof value.published_at === "string" &&
    isNullableString(value.archived_at) &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string" &&
    typeof value.commentary_html === "string"
  );
}

function isResourceLink(value: unknown): value is PublicResourceLink {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.url === "string" &&
    typeof value.resource_type === "string" &&
    resourceTypes.has(value.resource_type) &&
    isNullableString(value.creator) &&
    isNullableString(value.summary) &&
    typeof value.commentary_html === "string"
  );
}

function isListResponse<T>(
  value: unknown,
  isItem: (item: unknown) => item is T,
): value is ResourceListResponse<T> {
  return (
    isRecord(value) &&
    Array.isArray(value.resources) &&
    value.resources.every(isItem) &&
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

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    throw new Error("The resource service returned an invalid response.", {
      cause: error,
    });
  }
}

async function readManagedResource(
  response: Response,
): Promise<ManagedResource> {
  const body = await readJson(response);
  if (!isManagedResource(body)) {
    throw new Error("The resource service returned an invalid response.");
  }
  return body;
}

export async function listManagedResources(
  offset = 0,
  limit = 100,
): Promise<ResourceListResponse<ManagedResource>> {
  const query = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  const response = await authenticatedRequest(
    `/api/v1/resources/admin?${query.toString()}`,
  );
  const body = await readJson(response);
  if (!isListResponse(body, isManagedResource)) {
    throw new Error("The resource service returned an invalid response.");
  }
  return body;
}

export async function listAllManagedResources(): Promise<ManagedResource[]> {
  const resources: ManagedResource[] = [];
  let offset = 0;
  let total = 0;
  do {
    const page = await listManagedResources(offset, 100);
    resources.push(...page.resources);
    total = page.total;
    if (page.resources.length === 0 && offset < total) {
      throw new Error("The resource service returned an incomplete list.");
    }
    offset += page.resources.length;
  } while (offset < total);
  return resources;
}

export async function getManagedResource(
  resourceId: string,
): Promise<ManagedResource> {
  return readManagedResource(
    await authenticatedRequest(
      `/api/v1/resources/admin/${encodeURIComponent(resourceId)}`,
    ),
  );
}

export async function createResource(
  input: ResourceInput,
): Promise<ManagedResource> {
  return readManagedResource(
    await authenticatedRequest("/api/v1/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function updateResource(
  resourceId: string,
  input: ResourceInput & { status: ResourceStatus },
): Promise<ManagedResource> {
  return readManagedResource(
    await authenticatedRequest(
      `/api/v1/resources/admin/${encodeURIComponent(resourceId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    ),
  );
}

export async function deleteResource(resourceId: string): Promise<void> {
  await authenticatedRequest(
    `/api/v1/resources/admin/${encodeURIComponent(resourceId)}`,
    { method: "DELETE" },
  );
}

export async function getPublishedResources({
  offset = 0,
  limit = 20,
  resourceType,
}: {
  offset?: number;
  limit?: number;
  resourceType?: ResourceType;
} = {}): Promise<ResourceListResponse<PublicResource>> {
  const query = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  if (resourceType) query.set("resource_type", resourceType);
  const response = await fetch(
    `${API_BASE_URL}/api/v1/resources?${query.toString()}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error("Published resources could not be loaded.");
  }
  const body = await readJson(response);
  if (!isListResponse(body, isPublicResource)) {
    throw new Error("The resource service returned an invalid response.");
  }
  return body;
}

export async function getPublishedResource(
  resourceId: string,
): Promise<PublicResource | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/resources/${encodeURIComponent(resourceId)}`,
    { cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error("The published resource could not be loaded.");
  }
  const body = await readJson(response);
  if (!isPublicResource(body)) {
    throw new Error("The resource service returned an invalid response.");
  }
  return body;
}

export function isPublicResourceLink(value: unknown): value is PublicResourceLink {
  return isResourceLink(value);
}
