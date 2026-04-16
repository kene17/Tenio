/// <reference types="jest" />

import { slaStatusValueClassName } from "../lib/claim-detail-summary";

describe("slaStatusValueClassName", () => {
  it("maps breached to a danger palette (not success)", () => {
    const cls = slaStatusValueClassName("breached");
    expect(cls).toMatch(/red/);
    expect(cls).not.toMatch(/green|emerald|lime/);
  });

  it("maps at-risk to a warning palette", () => {
    const cls = slaStatusValueClassName("at-risk");
    expect(cls).toMatch(/amber|yellow|orange/);
    expect(cls).not.toMatch(/red-/); // warning, not same as breached
  });

  it("maps healthy to a positive palette", () => {
    const cls = slaStatusValueClassName("healthy");
    expect(cls).toMatch(/green|emerald/);
  });
});
