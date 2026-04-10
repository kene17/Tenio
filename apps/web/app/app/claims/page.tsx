import { hasPermission } from "@tenio/domain";
import { redirect } from "next/navigation";

import { PilotErrorState } from "../../../components/pilot-error-state";
import { getLocaleMessages, getMessagesForLocale, getPilotErrorChrome } from "../../../lib/locale";
import {
  getClaimIntakeOptions,
  getClaimsList,
  getCurrentSession,
} from "../../../lib/pilot-api";
import { ClaimsClient } from "./claims-client";

export const dynamic = "force-dynamic";

export default async function ClaimsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  try {
    const canImport = hasPermission(session.role, "claims:import");
    const [claimsResponse, payerResponse, { messages }] = await Promise.all([
      getClaimsList(),
      canImport
        ? getClaimIntakeOptions()
        : Promise.resolve({
            items: [] as Array<{
              payerId: string;
              payerName: string;
              jurisdiction: "us" | "ca";
              countryCode: "US" | "CA";
            }>
          }),
      getLocaleMessages()
    ]);
    const fallbackMessages = getMessagesForLocale("en");

    return (
      <ClaimsClient
        items={claimsResponse.items}
        organizationId={session.organizationId}
        currentRole={session.role}
        messages={messages.claims ?? fallbackMessages.claims}
        roleHelpTitle={messages.roleHelp?.title ?? fallbackMessages.roleHelp.title}
        payerOptions={payerResponse.items.map((payer) => ({
          id: payer.payerId,
          label: payer.payerName,
          jurisdiction: payer.jurisdiction,
          countryCode: payer.countryCode
        }))}
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
        title={e.claimsUnavailableTitle}
        body={e.claimsUnavailableBody}
      />
    );
  }
}
