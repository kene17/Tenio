import assert from "node:assert/strict";
import test from "node:test";

import {
  SLA_AT_RISK_WINDOW_MS,
  buildPilotSlaPresentation,
  evaluateSlaRisk
} from "./domain/sla-risk.js";

const H = 60 * 60 * 1000;

test("evaluateSlaRisk: past deadline is breached", () => {
  const now = Date.UTC(2026, 3, 16, 12, 0, 0);
  const sla = new Date(now - H).toISOString();
  assert.equal(evaluateSlaRisk(sla, now), "breached");
});

test("evaluateSlaRisk: exactly at deadline is at-risk (not breached)", () => {
  const now = Date.UTC(2026, 3, 16, 12, 0, 0);
  const sla = new Date(now).toISOString();
  assert.equal(evaluateSlaRisk(sla, now), "at-risk");
});

test("evaluateSlaRisk: just before 8h window is at-risk", () => {
  const now = Date.UTC(2026, 3, 16, 12, 0, 0);
  const sla = new Date(now + SLA_AT_RISK_WINDOW_MS - 1).toISOString();
  assert.equal(evaluateSlaRisk(sla, now), "at-risk");
});

test("evaluateSlaRisk: exactly 8h remaining is healthy", () => {
  const now = Date.UTC(2026, 3, 16, 12, 0, 0);
  const sla = new Date(now + SLA_AT_RISK_WINDOW_MS).toISOString();
  assert.equal(evaluateSlaRisk(sla, now), "healthy");
});

test("evaluateSlaRisk: well beyond 8h is healthy", () => {
  const now = Date.UTC(2026, 3, 16, 12, 0, 0);
  const sla = new Date(now + 48 * H).toISOString();
  assert.equal(evaluateSlaRisk(sla, now), "healthy");
});

test("buildPilotSlaPresentation: breached uses Breached label", () => {
  const now = Date.UTC(2026, 3, 16, 12, 0, 0);
  const sla = new Date(now - 1).toISOString();
  const p = buildPilotSlaPresentation(sla, now);
  assert.equal(p.risk, "breached");
  assert.equal(p.label, "Breached");
});

test("buildPilotSlaPresentation: risk and label always agree (invariant)", () => {
  const now = Date.UTC(2026, 3, 16, 12, 0, 0);
  const cases = [
    new Date(now - 2 * H).toISOString(),
    new Date(now).toISOString(),
    new Date(now + 3 * H).toISOString(),
    new Date(now + 72 * H).toISOString()
  ];
  for (const sla of cases) {
    const { risk, label } = buildPilotSlaPresentation(sla, now);
    if (risk === "breached") {
      assert.equal(label, "Breached");
    } else {
      assert.match(label, /^\d+h remaining$/);
      assert.ok(!label.includes("Breached"));
    }
  }
});

test("buildPilotSlaPresentation: non-breached uses at least 1h in label", () => {
  const now = Date.UTC(2026, 3, 16, 12, 0, 0);
  const sla = new Date(now + 30 * 60 * 1000).toISOString(); // 30 min left
  const p = buildPilotSlaPresentation(sla, now);
  assert.equal(p.risk, "at-risk");
  assert.equal(p.label, "1h remaining");
});
