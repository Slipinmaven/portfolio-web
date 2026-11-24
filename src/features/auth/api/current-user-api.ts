import { authenticatedRequest } from "@/lib/api/authenticated-request";

export type WorkspaceRole = "admin" | "editor";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return value === "admin" || value === "editor";
}

export async function getCurrentUserRole(): Promise<WorkspaceRole> {
  const response = await authenticatedRequest("/api/v1/auth/me");

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new Error("The user service returned an invalid response.", {
      cause: error,
    });
  }

  if (!isRecord(body) || !isWorkspaceRole(body.role)) {
    throw new Error("The user service returned an invalid response.");
  }

  return body.role;
}
