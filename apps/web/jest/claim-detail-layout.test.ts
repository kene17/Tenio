/// <reference types="jest" />

import {
  CLAIM_DETAIL_PAGE_ROOT_CLASS,
  CLAIM_DETAIL_TABS_SECTION_CLASS
} from "../lib/claim-detail-layout";

function classTokens(className: string): string[] {
  return className.trim().split(/\s+/).filter(Boolean);
}

describe("claim detail layout", () => {
  it("uses min-h-full on the root so content can grow and the shell main scrolls", () => {
    expect(CLAIM_DETAIL_PAGE_ROOT_CLASS).toContain("min-h-full");
    expect(classTokens(CLAIM_DETAIL_PAGE_ROOT_CLASS)).not.toContain("h-full");
  });

  it("does not wrap tabs in a nested overflow scroll region", () => {
    expect(CLAIM_DETAIL_TABS_SECTION_CLASS).not.toContain("overflow-y-auto");
    expect(CLAIM_DETAIL_TABS_SECTION_CLASS).not.toContain("overflow-auto");
    expect(CLAIM_DETAIL_TABS_SECTION_CLASS).not.toContain("flex-1");
  });
});
