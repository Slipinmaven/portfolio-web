import { API_BASE_URL } from "@/lib/api/api-url";

import { isPublicPage, type PublicPage } from "@/features/pages/api/page-types";

export async function getPublishedPage(
  slug: string,
): Promise<PublicPage | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/pages/${encodeURIComponent(slug)}`,
    { cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error("The published page could not be loaded.");
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new Error("The page service returned an invalid response.", {
      cause: error,
    });
  }
  if (!isPublicPage(body)) {
    throw new Error("The page service returned an invalid response.");
  }
  return body;
}
