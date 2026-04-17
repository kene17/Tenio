/**
 * Layout tokens for the claim detail page. The dashboard shell's <main> is the
 * only vertical scroll container; these classes must not re-introduce a nested
 * overflow scroll around the tabbed content.
 */
export const CLAIM_DETAIL_PAGE_ROOT_CLASS =
  "flex min-h-full flex-col bg-gray-50";

/** Direct wrapper around <ClaimDetailTabs /> — no flex-1 / overflow-y-auto. */
export const CLAIM_DETAIL_TABS_SECTION_CLASS =
  "mx-auto w-full max-w-[1600px] px-6 py-6";
