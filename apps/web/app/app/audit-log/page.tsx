import { getAuditLog } from "../../../lib/pilot-api";
import { PilotErrorState } from "../../../components/pilot-error-state";
import { AuditLogClient } from "./audit-log-client";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  try {
    const { items } = await getAuditLog();

    return <AuditLogClient events={items} />;
  } catch {
    return (
      <PilotErrorState
        title="Audit log unavailable"
        body="The audit log could not load from the API. Confirm the API and Postgres container are healthy, then refresh."
      />
    );
  }
}
