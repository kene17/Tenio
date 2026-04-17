import { PilotErrorState } from "../../../components/pilot-error-state";
import { getLocaleMessages, getMessagesForLocale, getPilotErrorChrome } from "../../../lib/locale";
import {
  getAuditLog,
  getCurrentSession,
  getPayerConfigurations,
  getPayerCredentials,
  type PayerCredentialView
} from "../../../lib/pilot-api";
import { ConfigurationClient } from "./configuration-client";

export const dynamic = "force-dynamic";

const CREDENTIAL_PAYER_IDS = [
  "payer_telus_eclaims",
  "payer_sun_life",
  "payer_manulife",
  "payer_canada_life",
  "payer_green_shield"
] as const;

export default async function ConfigurationPage() {
  try {
    const [{ items: payers }, { items: auditEvents }, session, { messages }, ...credentialResults] =
      await Promise.all([
        getPayerConfigurations(),
        getAuditLog(),
        getCurrentSession(),
        getLocaleMessages(),
        ...CREDENTIAL_PAYER_IDS.map((id) =>
          getPayerCredentials(id).catch(
            (): PayerCredentialView => ({ connected: false, lastVerifiedAt: null })
          )
        )
      ]);
    const fallbackMessages = getMessagesForLocale("en");

    const credentialsByPayerId: Record<string, PayerCredentialView> = {};
    CREDENTIAL_PAYER_IDS.forEach((id, i) => {
      credentialsByPayerId[id] = credentialResults[i] as PayerCredentialView;
    });

    return (
      <ConfigurationClient
        payers={payers}
        auditEvents={auditEvents}
        currentRole={session?.role ?? "viewer"}
        messages={messages.configuration ?? fallbackMessages.configuration}
        roleHelpTitle={messages.roleHelp?.title ?? fallbackMessages.roleHelp.title}
        credentialsByPayerId={credentialsByPayerId}
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
