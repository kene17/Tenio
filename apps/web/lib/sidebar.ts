export const SIDEBAR_EXPANDED_WIDTH = 232;
export const SIDEBAR_COLLAPSED_WIDTH = 56;
export const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";

/**
 * Reads the raw localStorage value and returns the parsed collapsed preference.
 * Only the exact string "true" maps to collapsed; anything else (null, missing,
 * "false", "1") is treated as expanded so the sidebar is open by default.
 */
export function parseSidebarCollapsedPref(stored: string | null): boolean {
  return stored === "true";
}

/** Returns the pixel width the sidebar should render at for a given collapsed state. */
export function sidebarWidth(collapsed: boolean): number {
  return collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;
}
