import { hasPermission } from "@tenio/domain";
import { redirect } from "next/navigation";
import { PilotErrorState } from "../../../components/pilot-error-state";
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
    const [claimsResponse, payerResponse] = await Promise.all([
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
          })
    ]);

    return (
      <ClaimsClient
        items={claimsResponse.items}
        organizationId={session.organizationId}
        currentRole={session.role}
        payerOptions={payerResponse.items.map((payer) => ({
          id: payer.payerId,
          label: payer.payerName,
          jurisdiction: payer.jurisdiction,
          countryCode: payer.countryCode
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
