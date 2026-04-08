import { PilotErrorState } from "../../../components/pilot-error-state";
import {
  getAuditLog,
  getCurrentSession,
  getPayerConfigurations
} from "../../../lib/pilot-api";
import { ConfigurationClient } from "./configuration-client";

export const dynamic = "force-dynamic";

export default async function ConfigurationPage() {
  try {
    const [{ items: payers }, { items: auditEvents }, session] = await Promise.all([
      getPayerConfigurations(),
      getAuditLog(),
      getCurrentSession()
    ]);

    return (
      <ConfigurationClient
        payers={payers}
        auditEvents={auditEvents}
        currentRole={session?.role ?? "viewer"}
      />
    );
  } catch {
    return (
      <PilotErrorState
        title="Configuration unavailable"
        body="The payer configuration workspace could not load live configuration data. Confirm the API is healthy, then refresh."
      />
    );
  }
}
