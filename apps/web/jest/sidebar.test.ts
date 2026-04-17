/// <reference types="jest" />

import {
  parseSidebarCollapsedPref,
  sidebarWidth,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_STORAGE_KEY,
} from "../lib/sidebar";

// ─── constants ────────────────────────────────────────────────────────────────

describe("sidebar constants", () => {
  it("expanded width is wider than collapsed", () => {
    expect(SIDEBAR_EXPANDED_WIDTH).toBeGreaterThan(SIDEBAR_COLLAPSED_WIDTH);
  });

  it("collapsed width is at least 40px so icons are legible", () => {
    expect(SIDEBAR_COLLAPSED_WIDTH).toBeGreaterThanOrEqual(40);
  });

  it("storage key is a non-empty string", () => {
    expect(typeof SIDEBAR_STORAGE_KEY).toBe("string");
    expect(SIDEBAR_STORAGE_KEY.length).toBeGreaterThan(0);
  });
});

// ─── parseSidebarCollapsedPref ────────────────────────────────────────────────

describe("parseSidebarCollapsedPref", () => {
  it("returns false when localStorage has never been set (null)", () => {
    expect(parseSidebarCollapsedPref(null)).toBe(false);
  });

  it("returns false when the stored value is the string 'false'", () => {
    expect(parseSidebarCollapsedPref("false")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(parseSidebarCollapsedPref("")).toBe(false);
  });

  it("returns false for numeric-truthy strings like '1'", () => {
    // Only the exact string 'true' should collapse the sidebar to prevent
    // accidental matches from other localStorage writes.
    expect(parseSidebarCollapsedPref("1")).toBe(false);
  });

  it("returns false for 'True' (case-sensitive)", () => {
    expect(parseSidebarCollapsedPref("True")).toBe(false);
  });

  it("returns true only for the exact string 'true'", () => {
    expect(parseSidebarCollapsedPref("true")).toBe(true);
  });

  it("round-trips: String(true) parses back to true", () => {
    expect(parseSidebarCollapsedPref(String(true))).toBe(true);
  });

  it("round-trips: String(false) parses back to false", () => {
    expect(parseSidebarCollapsedPref(String(false))).toBe(false);
  });
});

// ─── sidebarWidth ─────────────────────────────────────────────────────────────

describe("sidebarWidth", () => {
  it("returns SIDEBAR_EXPANDED_WIDTH when not collapsed", () => {
    expect(sidebarWidth(false)).toBe(SIDEBAR_EXPANDED_WIDTH);
  });

  it("returns SIDEBAR_COLLAPSED_WIDTH when collapsed", () => {
    expect(sidebarWidth(true)).toBe(SIDEBAR_COLLAPSED_WIDTH);
  });

  it("collapsed width is strictly less than expanded width", () => {
    expect(sidebarWidth(true)).toBeLessThan(sidebarWidth(false));
  });

  it("returns a positive integer in both states", () => {
    for (const collapsed of [true, false]) {
      const w = sidebarWidth(collapsed);
      expect(w).toBeGreaterThan(0);
      expect(Number.isInteger(w)).toBe(true);
    }
  });
});
