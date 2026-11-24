import { authenticatedRequest } from "@/lib/api/authenticated-request";

const API_PAGE_SIZE = 100;

export type Category = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Tag = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CategoryInput = Omit<
  Category,
  "id" | "created_at" | "updated_at"
>;
export type TagInput = Omit<Tag, "id" | "created_at" | "updated_at">;
export type CategoryMoveDirection = "up" | "down";

export type TaxonomyListResponse<T> = {
  items: T[];
  total: number;
  offset: number;
  limit: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isCategory(value: unknown): value is Category {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isNullableString(value.parent_id) &&
    typeof value.name === "string" &&
    typeof value.slug === "string" &&
    isNullableString(value.description) &&
    typeof value.display_order === "number" &&
    Number.isInteger(value.display_order) &&
    value.display_order >= 0 &&
    typeof value.is_active === "boolean" &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string"
  );
}

function isTag(value: unknown): value is Tag {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.slug === "string" &&
    isNullableString(value.description) &&
    typeof value.is_active === "boolean" &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string"
  );
}

function isListMetadata(
  value: Record<string, unknown>,
): value is Record<string, unknown> & {
  total: number;
  offset: number;
  limit: number;
} {
  return (
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

function isCategoryListResponse(
  value: unknown,
): value is {
  categories: Category[];
  total: number;
  offset: number;
  limit: number;
} {
  return (
    isRecord(value) &&
    Array.isArray(value.categories) &&
    value.categories.every(isCategory) &&
    isListMetadata(value)
  );
}

function isTagListResponse(
  value: unknown,
): value is {
  tags: Tag[];
  total: number;
  offset: number;
  limit: number;
} {
  return (
    isRecord(value) &&
    Array.isArray(value.tags) &&
    value.tags.every(isTag) &&
    isListMetadata(value)
  );
}

async function readJson(response: Response, serviceName: string): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`${serviceName} returned an invalid response.`, {
      cause: error,
    });
  }
}

async function readItem<T>(
  response: Response,
  serviceName: string,
  isItem: (value: unknown) => value is T,
): Promise<T> {
  const body = await readJson(response, serviceName);
  if (!isItem(body)) {
    throw new Error(`${serviceName} returned an invalid response.`);
  }
  return body;
}

function paginatedPath(
  endpoint: string,
  offset: number,
  limit: number,
): string {
  const query = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  return `${endpoint}?${query.toString()}`;
}

async function readCategoryList(
  endpoint: string,
  offset: number,
  limit: number,
): Promise<TaxonomyListResponse<Category>> {
  const response = await authenticatedRequest(
    paginatedPath(endpoint, offset, limit),
  );
  const body = await readJson(response, "The category service");
  if (!isCategoryListResponse(body)) {
    throw new Error("The category service returned an invalid response.");
  }
  return {
    items: body.categories,
    total: body.total,
    offset: body.offset,
    limit: body.limit,
  };
}

async function readTagList(
  endpoint: string,
  offset: number,
  limit: number,
): Promise<TaxonomyListResponse<Tag>> {
  const response = await authenticatedRequest(
    paginatedPath(endpoint, offset, limit),
  );
  const body = await readJson(response, "The tag service");
  if (!isTagListResponse(body)) {
    throw new Error("The tag service returned an invalid response.");
  }
  return {
    items: body.tags,
    total: body.total,
    offset: body.offset,
    limit: body.limit,
  };
}

async function readAllPages<T>(
  loadPage: (offset: number) => Promise<TaxonomyListResponse<T>>,
  serviceName: string,
): Promise<T[]> {
  const items: T[] = [];
  let offset = 0;

  while (true) {
    const page = await loadPage(offset);
    items.push(...page.items);
    if (items.length >= page.total) return items;
    if (page.items.length === 0) {
      throw new Error(`The ${serviceName} returned an incomplete list.`);
    }
    offset += page.items.length;
  }
}

export async function listManagedCategories(
  offset = 0,
  limit = API_PAGE_SIZE,
): Promise<TaxonomyListResponse<Category>> {
  return readCategoryList("/api/v1/categories/admin", offset, limit);
}

export async function listAvailableCategories(
  offset = 0,
  limit = API_PAGE_SIZE,
): Promise<TaxonomyListResponse<Category>> {
  return readCategoryList("/api/v1/categories", offset, limit);
}

export async function listAllManagedCategories(): Promise<Category[]> {
  return readAllPages(listManagedCategories, "category service");
}

export async function listAllAvailableCategories(): Promise<Category[]> {
  return readAllPages(listAvailableCategories, "category service");
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const response = await authenticatedRequest("/api/v1/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readItem(response, "The category service", isCategory);
}

export async function updateCategory(
  categoryId: string,
  input: CategoryInput,
): Promise<Category> {
  const response = await authenticatedRequest(
    `/api/v1/categories/${encodeURIComponent(categoryId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return readItem(response, "The category service", isCategory);
}

export async function moveCategory(
  categoryId: string,
  direction: CategoryMoveDirection,
): Promise<Category> {
  const response = await authenticatedRequest(
    `/api/v1/categories/${encodeURIComponent(categoryId)}/move`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    },
  );
  return readItem(response, "The category service", isCategory);
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await authenticatedRequest(
    `/api/v1/categories/${encodeURIComponent(categoryId)}`,
    { method: "DELETE" },
  );
}

export async function listManagedTags(
  offset = 0,
  limit = API_PAGE_SIZE,
): Promise<TaxonomyListResponse<Tag>> {
  return readTagList("/api/v1/tags/admin", offset, limit);
}

export async function listAvailableTags(
  offset = 0,
  limit = API_PAGE_SIZE,
): Promise<TaxonomyListResponse<Tag>> {
  return readTagList("/api/v1/tags", offset, limit);
}

export async function listAllManagedTags(): Promise<Tag[]> {
  return readAllPages(listManagedTags, "tag service");
}

export async function listAllAvailableTags(): Promise<Tag[]> {
  return readAllPages(listAvailableTags, "tag service");
}

export async function createTag(input: TagInput): Promise<Tag> {
  const response = await authenticatedRequest("/api/v1/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readItem(response, "The tag service", isTag);
}

export async function updateTag(tagId: string, input: TagInput): Promise<Tag> {
  const response = await authenticatedRequest(
    `/api/v1/tags/${encodeURIComponent(tagId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return readItem(response, "The tag service", isTag);
}

export async function deleteTag(tagId: string): Promise<void> {
  await authenticatedRequest(`/api/v1/tags/${encodeURIComponent(tagId)}`, {
    method: "DELETE",
  });
}
