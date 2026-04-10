import { hasPermission } from "@tenio/domain";
import { redirect } from "next/navigation";

import { PilotErrorState } from "../../../components/pilot-error-state";
import { getLocaleMessages, getMessagesForLocale, getPilotErrorChrome } from "../../../lib/locale";
import { getCurrentSession, getPerformance } from "../../../lib/pilot-api";
import { PerformanceClient } from "./performance-client";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const session = await getCurrentSession();

  if (!session || !hasPermission(session.role, "performance:read")) {
    redirect("/app/queue");
  }

  try {
    const [{ item }, { messages }] = await Promise.all([getPerformance(), getLocaleMessages()]);
    return (
      <PerformanceClient
        data={item}
        messages={messages.performance ?? getMessagesForLocale("en").performance}
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
        title={e.performanceUnavailableTitle}
        body={e.performanceUnavailableBody}
      />
    );
  }
}
