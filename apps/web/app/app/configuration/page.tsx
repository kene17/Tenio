import { PilotErrorState } from "../../../components/pilot-error-state";
import { getLocaleMessages, getMessagesForLocale, getPilotErrorChrome } from "../../../lib/locale";
import {
  getAuditLog,
  getCurrentSession,
  getPayerConfigurations
} from "../../../lib/pilot-api";
import { ConfigurationClient } from "./configuration-client";

export const dynamic = "force-dynamic";

export default async function ConfigurationPage() {
  try {
    const [{ items: payers }, { items: auditEvents }, session, { messages }] = await Promise.all([
      getPayerConfigurations(),
      getAuditLog(),
      getCurrentSession(),
      getLocaleMessages()
    ]);
    const fallbackMessages = getMessagesForLocale("en");

    return (
      <ConfigurationClient
        payers={payers}
        auditEvents={auditEvents}
        currentRole={session?.role ?? "viewer"}
        messages={messages.configuration ?? fallbackMessages.configuration}
        roleHelpTitle={messages.roleHelp?.title ?? fallbackMessages.roleHelp.title}
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
        title={e.configurationUnavailableTitle}
        body={e.configurationUnavailableBody}
      />
    );
  }
}
