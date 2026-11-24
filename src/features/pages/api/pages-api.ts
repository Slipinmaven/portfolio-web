import { authenticatedRequest } from "@/lib/api/authenticated-request";

import {
  isPageDetail,
  isPageListResponse,
  isPageRevisionListResponse,
  isRecord,
  type PageCreateInput,
  type PageDetail,
  type PageDraftInput,
  type PageListResponse,
  type PageRevisionListResponse,
  type PageStatus,
} from "@/features/pages/api/page-types";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    throw new Error("The page service returned an invalid response.", {
      cause: error,
    });
  }
}

async function readPageDetail(response: Response): Promise<PageDetail> {
  const body = await readJson(response);
  if (!isPageDetail(body)) {
    throw new Error("The page service returned an invalid response.");
  }
  return body;
}

export async function listManagedPages(
  offset: number,
  limit: number,
  status?: PageStatus,
): Promise<PageListResponse> {
  const query = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  if (status) query.set("status", status);
  const response = await authenticatedRequest(
    `/api/v1/pages/admin?${query.toString()}`,
  );
  const body = await readJson(response);
  if (!isPageListResponse(body)) {
    throw new Error("The page service returned an invalid list.");
  }
  return body;
}

export async function listAllManagedPages(): Promise<PageListResponse["pages"]> {
  const pages: PageListResponse["pages"] = [];
  let offset = 0;
  let total = 0;
  do {
    const result = await listManagedPages(offset, 100);
    pages.push(...result.pages);
    total = result.total;
    if (result.pages.length === 0 && offset < total) {
      throw new Error("The page service returned an incomplete list.");
    }
    offset += result.pages.length;
  } while (offset < total);
  return pages;
}

export async function getManagedPage(pageId: string): Promise<PageDetail> {
  const response = await authenticatedRequest(
    `/api/v1/pages/admin/${encodeURIComponent(pageId)}`,
  );
  return readPageDetail(response);
}

export async function createPage(input: PageCreateInput): Promise<PageDetail> {
  const response = await authenticatedRequest("/api/v1/pages/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readPageDetail(response);
}

export async function savePageDraft(
  pageId: string,
  input: PageDraftInput,
): Promise<PageDetail> {
  const response = await authenticatedRequest(
    `/api/v1/pages/admin/${encodeURIComponent(pageId)}/draft`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return readPageDetail(response);
}

export async function publishPageDraft(
  pageId: string,
  changeNote: string,
): Promise<PageDetail> {
  const response = await authenticatedRequest(
    `/api/v1/pages/admin/${encodeURIComponent(pageId)}/publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ change_note: changeNote.trim() || null }),
    },
  );
  return readPageDetail(response);
}

export async function discardPageDraft(pageId: string): Promise<PageDetail> {
  const response = await authenticatedRequest(
    `/api/v1/pages/admin/${encodeURIComponent(pageId)}/discard`,
    { method: "POST" },
  );
  return readPageDetail(response);
}

export async function archivePage(pageId: string): Promise<PageDetail> {
  const response = await authenticatedRequest(
    `/api/v1/pages/admin/${encodeURIComponent(pageId)}/archive`,
    { method: "POST" },
  );
  return readPageDetail(response);
}

export async function republishPage(pageId: string): Promise<PageDetail> {
  const response = await authenticatedRequest(
    `/api/v1/pages/admin/${encodeURIComponent(pageId)}/republish`,
    { method: "POST" },
  );
  return readPageDetail(response);
}

export async function listPageRevisions(
  pageId: string,
): Promise<PageRevisionListResponse> {
  const response = await authenticatedRequest(
    `/api/v1/pages/admin/${encodeURIComponent(pageId)}/revisions`,
  );
  const body = await readJson(response);
  if (!isPageRevisionListResponse(body)) {
    throw new Error("The page service returned an invalid revision history.");
  }
  return body;
}

export async function rollbackPageRevision(
  pageId: string,
  revisionId: string,
): Promise<PageDetail> {
  const response = await authenticatedRequest(
    `/api/v1/pages/admin/${encodeURIComponent(pageId)}/revisions/${encodeURIComponent(revisionId)}/rollback`,
    { method: "POST" },
  );
  return readPageDetail(response);
}

export async function renderPageMarkdownPreview(body: string): Promise<string> {
  const response = await authenticatedRequest("/api/v1/pages/admin/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  const value = await readJson(response);
  if (!isRecord(value) || typeof value.html !== "string") {
    throw new Error("The page service returned an invalid Markdown preview.");
  }
  return value.html;
}
