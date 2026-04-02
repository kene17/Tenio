import { getQueue } from "../../../lib/pilot-api";
import { PilotErrorState } from "../../../components/pilot-error-state";
import { QueueClient } from "./queue-client";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  try {
    const { items } = await getQueue();

    return <QueueClient items={items} />;
  } catch {
    return (
      <PilotErrorState
        title="Queue unavailable"
        body="The pilot queue could not load from the API. Confirm the API and Postgres container are running, then refresh the page."
      />
    );
  }
}
