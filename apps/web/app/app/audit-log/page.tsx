import { PilotErrorState } from "../../../components/pilot-error-state";
import { getLocaleMessages, getMessagesForLocale, getPilotErrorChrome } from "../../../lib/locale";
import { getAuditLog } from "../../../lib/pilot-api";
import { AuditLogClient } from "./audit-log-client";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  try {
    const [{ items }, { messages }] = await Promise.all([getAuditLog(), getLocaleMessages()]);

    return (
      <AuditLogClient
        events={items}
        messages={messages.auditLog ?? getMessagesForLocale("en").auditLog}
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
        title={e.auditUnavailableTitle}
        body={e.auditUnavailableBody}
      />
    );
  }
}
