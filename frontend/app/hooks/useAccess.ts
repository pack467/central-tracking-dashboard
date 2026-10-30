"use client";

import { useCallback } from "react";
import { useAuth } from "@/app/lib/auth";
import { ACTION_PERMISSION, type AccessAction } from "@/app/lib/access";

/**
 * `can(action)` for the logged-in person. With the backend login it follows their permissions from the server; in demo mode (no backend)
 * everything is allowed here and the existing demo role rules apply.
 */
export function useAccess() {
  const { hasPermission } = useAuth();
  const can = useCallback((action: AccessAction) => hasPermission(ACTION_PERMISSION[action]), [hasPermission]);
  return { can };
}
