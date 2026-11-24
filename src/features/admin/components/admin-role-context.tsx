"use client";

import { createContext, useContext } from "react";

import type { WorkspaceRole } from "@/features/auth/api/current-user-api";

const AdminRoleContext = createContext<WorkspaceRole | null>(null);

export const AdminRoleProvider = AdminRoleContext.Provider;

export function useAdminRole(): WorkspaceRole | null {
  return useContext(AdminRoleContext);
}
