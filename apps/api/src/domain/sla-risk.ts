/** Milliseconds in one hour (used for SLA remaining label). */
export const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * SLA is "at risk" when the deadline is within this window (inclusive of the
 * deadline instant: diff === 0 is still inside this branch before "breached").
 */
export const SLA_AT_RISK_WINDOW_MS = 8 * MS_PER_HOUR;

export type SlaRiskLevel = "healthy" | "at-risk" | "breached";

/**
 * Classify SLA urgency relative to `nowMs`.
 *
 * Semantics:
 * - Past deadline (`slaAt` before `now`) → breached
 * - Less than 8 hours until deadline (including exactly at deadline) → at-risk
 * - Otherwise → healthy
 */
export function evaluateSlaRisk(slaAtIso: string, nowMs: number): SlaRiskLevel {
  const diff = new Date(slaAtIso).getTime() - nowMs;
  if (diff < 0) return "breached";
  if (diff < SLA_AT_RISK_WINDOW_MS) return "at-risk";
  return "healthy";
}

export type PilotSlaPresentation = {
  risk: SlaRiskLevel;
  /** Pilot UI string; must stay consistent with `risk` for the same clock. */
  label: string;
};

/**
 * Build pilot queue/detail SLA fields using a single clock so `risk` and `label`
 * never disagree (e.g. breached deadline but "12h remaining").
 */
export function buildPilotSlaPresentation(
  slaAtIso: string,
  nowMs: number
): PilotSlaPresentation {
  const risk = evaluateSlaRisk(slaAtIso, nowMs);
  if (risk === "breached") {
    return { risk, label: "Breached" };
  }
  const slaTs = new Date(slaAtIso).getTime();
  const hoursLeft = Math.max(1, Math.round((slaTs - nowMs) / MS_PER_HOUR));
  return { risk, label: `${hoursLeft}h remaining` };
}
