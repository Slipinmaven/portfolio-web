import { API_BASE_URL } from "@/lib/api/api-url";

import {
  isPublicPost,
  isPublicPostListResponse,
  type PostKind,
  type PublicPost,
  type PublicPostListResponse,
} from "@/features/posts/api/post-types";

export async function getPublishedPosts(
  kind: PostKind,
  {
    offset = 0,
    limit = 20,
    categoryId,
  }: { offset?: number; limit?: number; categoryId?: string } = {},
): Promise<PublicPostListResponse> {
  const query = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  if (categoryId) query.set("category_id", categoryId);
  const response = await fetch(
    `${API_BASE_URL}/api/v1/posts/${kind}?${query.toString()}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error("Published posts could not be loaded.");
  }

  const body: unknown = await response.json();
  if (!isPublicPostListResponse(body)) {
    throw new Error("The post service returned an invalid response.");
  }
  return body;
}

export async function getPublishedPost(
  kind: PostKind,
  slug: string,
): Promise<PublicPost | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/posts/${kind}/${encodeURIComponent(slug)}`,
    { cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error("The published post could not be loaded.");
  }

  const body: unknown = await response.json();
  if (!isPublicPost(body)) {
    throw new Error("The post service returned an invalid response.");
  }
  return body;
}
