import { authenticatedRequest } from "@/lib/api/authenticated-request";

import {
  isAdminPost,
  isAdminPostListResponse,
  isRecord,
  type AdminPost,
  type AdminPostListResponse,
  type PostCreateInput,
  type PostKind,
  type PostStatus,
  type PostUpdateInput,
} from "@/features/posts/api/post-types";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    throw new Error("The post service returned an invalid response.", {
      cause: error,
    });
  }
}

async function readAdminPost(response: Response): Promise<AdminPost> {
  const body = await readJson(response);
  if (!isAdminPost(body)) {
    throw new Error("The post service returned an invalid response.");
  }
  return body;
}

export async function listManagedPosts(
  offset: number,
  limit: number,
  kind?: PostKind,
  status?: PostStatus,
): Promise<AdminPostListResponse> {
  const query = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  if (kind) query.set("kind", kind);
  if (status) query.set("status", status);

  const response = await authenticatedRequest(
    `/api/v1/posts/admin?${query.toString()}`,
  );
  const body = await readJson(response);
  if (!isAdminPostListResponse(body)) {
    throw new Error("The post service returned an invalid response.");
  }
  return body;
}

export async function listAllManagedPosts(): Promise<AdminPost[]> {
  const posts: AdminPost[] = [];
  let offset = 0;
  let total = 0;

  do {
    const page = await listManagedPosts(offset, 100);
    posts.push(...page.posts);
    total = page.total;
    if (page.posts.length === 0 && offset < total) {
      throw new Error("The post service returned an incomplete list.");
    }
    offset += page.posts.length;
  } while (offset < total);

  return posts;
}

export async function getManagedPost(postId: string): Promise<AdminPost> {
  const response = await authenticatedRequest(
    `/api/v1/posts/admin/${encodeURIComponent(postId)}`,
  );
  return readAdminPost(response);
}

export async function createPost(input: PostCreateInput): Promise<AdminPost> {
  const response = await authenticatedRequest("/api/v1/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readAdminPost(response);
}

export async function updatePost(
  postId: string,
  input: PostUpdateInput,
): Promise<AdminPost> {
  const response = await authenticatedRequest(
    `/api/v1/posts/admin/${encodeURIComponent(postId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return readAdminPost(response);
}

export async function renderMarkdownPreview(body: string): Promise<string> {
  const response = await authenticatedRequest("/api/v1/posts/admin/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  const value = await readJson(response);
  if (!isRecord(value) || typeof value.html !== "string") {
    throw new Error("The post service returned an invalid preview.");
  }
  return value.html;
}
