export type SlaRiskLevel = "healthy" | "at-risk" | "breached";

/** Tailwind text color for the SLA value in the claim summary grid. */
export function slaStatusValueClassName(slaRisk: SlaRiskLevel): string {
  if (slaRisk === "breached") return "text-red-700";
  if (slaRisk === "at-risk") return "text-amber-700";
  return "text-green-700";
}
