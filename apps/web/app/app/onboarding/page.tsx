import { hasPermission } from "@tenio/domain";
import { redirect } from "next/navigation";
import { PilotErrorState } from "../../../components/pilot-error-state";
import { getLocaleMessages } from "../../../lib/locale";
import { getClaimIntakeOptions, getCurrentSession } from "../../../lib/pilot-api";
import { OnboardingClient } from "./onboarding-client";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  if (!hasPermission(session.role, "claims:import")) {
    return (
      <PilotErrorState
        title="Onboarding access denied"
        body="Your role can view claim activity, but only owners, managers, and operators can import or onboard claims."
      />
    );
  }

  try {
    const [{ items }, { locale, messages }] = await Promise.all([
      getClaimIntakeOptions(),
      getLocaleMessages()
    ]);

    return (
        <OnboardingClient
          locale={locale}
          messages={messages.onboarding}
          currentRole={session.role}
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
        body="The onboarding workspace could not load import and payer setup data. Confirm the API is healthy, then refresh."
      />
    );
  }
}
