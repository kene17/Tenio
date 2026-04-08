import { hasPermission } from "@tenio/domain";

import { PilotErrorState } from "../../../components/pilot-error-state";
import { getLocaleMessages, getMessagesForLocale } from "../../../lib/locale";
import { getCurrentSession, getOnboardingState, getQueue } from "../../../lib/pilot-api";
import { QueueClient } from "./queue-client";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  try {
    const session = await getCurrentSession();
    const canSeeOnboardingGuide = session
      ? hasPermission(session.role, "users:read")
      : false;
    const [{ items }, { messages }, onboardingState] = await Promise.all([
      getQueue(),
      getLocaleMessages(),
      canSeeOnboardingGuide ? getOnboardingState() : Promise.resolve(null)
    ]);
    const onboardingMessages = messages.onboarding ?? getMessagesForLocale("en").onboarding;

    return (
      <QueueClient
        items={items}
        onboardingMessages={onboardingMessages}
        onboardingState={onboardingState?.item ?? null}
      />
    );
  } catch {
    return (
      <PilotErrorState
        title="Queue unavailable"
        body="The pilot queue could not load from the API. Confirm the API and Postgres container are running, then refresh the page."
      />
    );
  }
}
