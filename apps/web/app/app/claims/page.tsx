import { PilotErrorState } from "../../../components/pilot-error-state";
import {
  getClaimsList,
  getCurrentSession,
  getPayerConfigurations
} from "../../../lib/pilot-api";
import { ClaimsClient } from "./claims-client";

export const dynamic = "force-dynamic";

export default async function ClaimsPage() {
  try {
    const [claimsResponse, payerResponse, session] = await Promise.all([
      getClaimsList(),
      getPayerConfigurations(),
      getCurrentSession()
    ]);

    return (
      <ClaimsClient
        items={claimsResponse.items}
        organizationId={session?.organizationId ?? "org_demo"}
        payerOptions={payerResponse.items.map((payer) => ({
          id: payer.payerId,
          label: payer.payerName
        }))}
      />
    );
  } catch {
    return (
      <PilotErrorState
        title="Claims unavailable"
        body="The claims workspace could not load from the API. Confirm the API and database are healthy, then refresh."
      />
    );
  }
}
