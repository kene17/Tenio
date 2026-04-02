import { PilotErrorState } from "../../../components/pilot-error-state";
import { getPayerConfigurations } from "../../../lib/pilot-api";
import { OnboardingClient } from "./onboarding-client";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  try {
    const { items } = await getPayerConfigurations();

    return (
      <OnboardingClient
        payers={items.map((payer) => ({
          payerId: payer.payerId,
          payerName: payer.payerName
        }))}
      />
    );
  } catch {
    return (
      <PilotErrorState
        title="Onboarding unavailable"
        body="The onboarding workspace could not load payer configuration data. Confirm the API is healthy, then refresh."
      />
    );
  }
}
