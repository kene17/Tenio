import { PilotErrorState } from "../../../components/pilot-error-state";
import { getLocaleMessages } from "../../../lib/locale";
import { getCurrentSession, getPayerConfigurations } from "../../../lib/pilot-api";
import { OnboardingClient } from "./onboarding-client";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  try {
    const [{ items }, { locale, messages }, session] = await Promise.all([
      getPayerConfigurations(),
      getLocaleMessages(),
      getCurrentSession()
    ]);

    return (
        <OnboardingClient
          locale={locale}
          messages={messages.onboarding}
          currentRole={session?.role ?? "viewer"}
          payers={items.map((payer) => ({
            payerId: payer.payerId,
            payerName: payer.payerName,
            jurisdiction: payer.jurisdiction,
            countryCode: payer.countryCode
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
