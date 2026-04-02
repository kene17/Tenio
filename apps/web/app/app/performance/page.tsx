import { PilotErrorState } from "../../../components/pilot-error-state";
import { getPerformance } from "../../../lib/pilot-api";
import { PerformanceClient } from "./performance-client";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  try {
    const { item } = await getPerformance();
    return <PerformanceClient data={item} />;
  } catch {
    return (
      <PilotErrorState
        title="Performance unavailable"
        body="The performance dashboard could not load live metrics from the API. Confirm the API is healthy, then refresh."
      />
    );
  }
}
