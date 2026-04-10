import { hasPermission } from "@tenio/domain";
import { redirect } from "next/navigation";

import { PilotErrorState } from "../../../components/pilot-error-state";
import { getLocaleMessages, getMessagesForLocale, getPilotErrorChrome } from "../../../lib/locale";
import {
  getClaimIntakeOptions,
  getCurrentSession,
  getOnboardingState
} from "../../../lib/pilot-api";
import { OnboardingClient } from "./onboarding-client";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getCurrentSession();
  const { messages } = await getLocaleMessages();
  const fallbackMessages = getMessagesForLocale("en");
  const onboardingMessages = messages.onboarding ?? fallbackMessages.onboarding;
  const pilotError = getPilotErrorChrome(messages);

  if (!session) {
    redirect("/login");
  }

  if (!hasPermission(session.role, "claims:import")) {
    return (
      <PilotErrorState
        eyebrow={pilotError.eyebrow}
        openPilotGuide={pilotError.openPilotGuide}
        contactSupport={pilotError.contactSupport}
        title={onboardingMessages.noAccessTitle}
        body={onboardingMessages.noAccessBody}
      />
    );
  }

  try {
    const canSeeSetupChecklist = hasPermission(session.role, "users:read");
    const [{ items }, onboardingState] = await Promise.all([
      getClaimIntakeOptions(),
      canSeeSetupChecklist ? getOnboardingState() : Promise.resolve(null)
    ]);

    return (
      <OnboardingClient
        messages={onboardingMessages}
        currentRole={session.role}
        roleHelpTitle={messages.roleHelp?.title ?? fallbackMessages.roleHelp.title}
        setupState={onboardingState?.item ?? null}
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
        eyebrow={pilotError.eyebrow}
        openPilotGuide={pilotError.openPilotGuide}
        contactSupport={pilotError.contactSupport}
        title={pilotError.onboardingUnavailableTitle}
        body={pilotError.onboardingUnavailableBody}
      />
    );
  }
}
