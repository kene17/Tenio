import { hasPermission } from "@tenio/domain";

import { PilotErrorState } from "../../../components/pilot-error-state";
import { getLocaleMessages, getMessagesForLocale, getPilotErrorChrome } from "../../../lib/locale";
import {
  getClaimsList,
  getCurrentSession,
  getOnboardingState,
  getQueue
} from "../../../lib/pilot-api";
import { QueueClient } from "./queue-client";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  try {
    const session = await getCurrentSession();
    const canSeeOnboardingGuide = session
      ? hasPermission(session.role, "users:read")
      : false;
    const [{ items }, claimsResponse, { messages }, onboardingState] = await Promise.all([
      getQueue(),
      getClaimsList(),
      getLocaleMessages(),
      canSeeOnboardingGuide ? getOnboardingState() : Promise.resolve(null)
    ]);
    const fallbackMessages = getMessagesForLocale("en");
    const onboardingMessages = messages.onboarding ?? fallbackMessages.onboarding;
    const queueMessages = messages.queue ?? fallbackMessages.queue;
    const retrieveMessages = messages.retrieve ?? fallbackMessages.retrieve;
    const roleHelpTitle = messages.roleHelp?.title ?? fallbackMessages.roleHelp.title;

    return (
      <QueueClient
        items={items}
        hasAnyClaims={claimsResponse.items.length > 0}
        currentRole={session?.role ?? "viewer"}
        queueMessages={queueMessages}
        retrieveMessages={retrieveMessages}
        roleHelpTitle={roleHelpTitle}
        onboardingMessages={onboardingMessages}
        onboardingState={onboardingState?.item ?? null}
      />
    );
  } catch {
    const { messages } = await getLocaleMessages();
    const e = getPilotErrorChrome(messages);
    return (
      <PilotErrorState
        eyebrow={e.eyebrow}
        openPilotGuide={e.openPilotGuide}
        contactSupport={e.contactSupport}
        title={e.queueUnavailableTitle}
        body={e.queueUnavailableBody}
      />
    );
  }
}
