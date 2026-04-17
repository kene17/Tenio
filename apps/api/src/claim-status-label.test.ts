import assert from "node:assert/strict";
import test from "node:test";

import type { ClaimStatus } from "@tenio/domain";

import { statusLabel } from "./domain/claim-status-label.js";

const cases: Array<{
  status: ClaimStatus;
  normalized: string;
  expected: string;
  note?: string;
}> = [
  { status: "resolved", normalized: "anything", expected: "Resolved" },
  { status: "blocked", normalized: "anything", expected: "Escalated" },
  { status: "needs_review", normalized: "anything", expected: "Needs Review" },
  {
    status: "in_review",
    normalized: "Payer portal: pending",
    expected: "Payer portal: pending",
    note: "shows payer-specific copy"
  },
  {
    status: "in_review",
    normalized: "",
    expected: "In Review",
    note: "fallback when normalized empty"
  },
  {
    status: "pending",
    normalized: "Awaiting ERA",
    expected: "Awaiting ERA",
    note: "pending uses normalized when present"
  },
  {
    status: "pending",
    normalized: "",
    expected: "Pending",
    note: "pending fallback"
  }
];

test("statusLabel maps workflow states to stable pilot UI strings", () => {
  for (const { status, normalized, expected } of cases) {
    assert.equal(
      statusLabel(status, normalized),
      expected,
      `${status} + "${normalized}"`
    );
  }
});
