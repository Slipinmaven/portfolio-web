import { API_BASE_URL } from "@/lib/api/api-url";
import { authenticatedRequest } from "@/lib/api/authenticated-request";

export type NavigationMenu = "HEADER" | "FOOTER" | "MOBILE";
export type NavigationLinkType =
  | "NONE"
  | "PAGE"
  | "ROUTE"
  | "PROJECT"
  | "POST"
  | "CATEGORY"
  | "EXTERNAL"
  | "EMAIL"
  | "PHONE"
  | "TEXT";

export type NavigationPublicItem = {
  id: string;
  label: string;
  link_type: NavigationLinkType;
  href: string | null;
  content_text: string | null;
  children: NavigationPublicItem[];
};

export type NavigationAdminItem = {
  id: string;
  menu: NavigationMenu;
  parent_id: string | null;
  label: string;
  link_type: NavigationLinkType;
  page_id: string | null;
  project_id: string | null;
  post_id: string | null;
  category_id: string | null;
  route_key: "PROJECTS" | "ARTICLES" | "NOTES" | "RESOURCES" | null;
  custom_target: string | null;
  content_text: string | null;
  display_order: number;
  is_visible: boolean;
  target_label: string | null;
  target_href: string | null;
  target_status: string | null;
  target_is_eligible: boolean;
  visibility_reason: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function getPublicNavigation(): Promise<
  Record<NavigationMenu, NavigationPublicItem[]>
> {
  const response = await fetch(`${API_BASE_URL}/api/v1/navigation/public`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("The navigation could not be loaded.");
  const body: unknown = await response.json();
  if (!isRecord(body) || !isRecord(body.menus)) {
    throw new Error("The navigation service returned an invalid response.");
  }
  return body.menus as Record<NavigationMenu, NavigationPublicItem[]>;
}

export async function getManagedNavigation(): Promise<
  Record<NavigationMenu, NavigationAdminItem[]>
> {
  const response = await authenticatedRequest("/api/v1/navigation/admin");
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new Error("The navigation service returned an invalid response.", {
      cause: error,
    });
  }
  if (!isRecord(body) || !isRecord(body.menus)) {
    throw new Error("The navigation service returned an invalid response.");
  }
  return body.menus as Record<NavigationMenu, NavigationAdminItem[]>;
}

export async function updateManagedNavigation(
  menu: NavigationMenu,
  items: Array<
    Omit<
      NavigationAdminItem,
      | "menu"
      | "display_order"
      | "target_label"
      | "target_href"
      | "target_status"
      | "target_is_eligible"
      | "visibility_reason"
    >
  >,
): Promise<NavigationAdminItem[]> {
  const response = await authenticatedRequest(
    `/api/v1/navigation/admin/${menu}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    },
  );
  const body: unknown = await response.json();
  if (!Array.isArray(body)) {
    throw new Error("The navigation service returned an invalid response.");
  }
  return body as NavigationAdminItem[];
}
