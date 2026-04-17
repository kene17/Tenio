import { randomUUID } from "node:crypto";

import { processReservedAgentJob, heartbeatIntervalMs } from "./agent-runtime.js";
import { AiServiceClient } from "./ai-service-client.js";
import { WorkflowApiClient } from "./api-client.js";
import { ConnectorServiceClient } from "./connector-service-client.js";

const aiClient = new AiServiceClient();
const workflowApi = new WorkflowApiClient();
const connectorServiceClient = new ConnectorServiceClient();
const workerName = process.env.TENIO_WORKER_NAME ?? "retrieval-worker-1";
const pollIntervalMs = Number(process.env.TENIO_WORKER_POLL_MS ?? 5000);

async function processOneJob() {
  const idleRequestId = `${workerName}:poll:${randomUUID()}`;
  const reservation = await workflowApi.claimNextJob(workerName, idleRequestId);
  const item = reservation.item;

  if (!item) {
    console.log(JSON.stringify({ worker: workerName, status: "idle", requestId: idleRequestId }));
    return;
  }

  const requestId = `${workerName}:${item.job.id}:${randomUUID()}`;
  let heartbeat: NodeJS.Timeout | null = null;
  let stopReason: string | null = null;

  try {
    heartbeat = setInterval(() => {
      void workflowApi
        .heartbeatAgentRun(item.agentRun.id, workerName, requestId)
        .catch((error) => {
          stopReason =
            error instanceof Error
              ? `Agent run heartbeat failed: ${error.message}`
              : "Agent run heartbeat failed.";
          console.error(
            JSON.stringify({
              worker: workerName,
              status: "heartbeat_failed",
              runId: item.agentRun.id,
              jobId: item.job.id,
              requestId,
              message: error instanceof Error ? error.message : "Agent heartbeat failed"
            })
          );
        });
    }, heartbeatIntervalMs);
    heartbeat.unref?.();

    await processReservedAgentJob(item, {
      workflowApi,
      aiClient,
      connectorServiceClient,
      workerName,
      requestId,
      getStopReason: () => stopReason
    });

    console.log(
      JSON.stringify({
        worker: workerName,
        status: "completed",
        runId: item.agentRun.id,
        jobId: item.job.id,
        claimId: item.claim.id,
        requestId
      })
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        worker: workerName,
        status: "crashed",
        runId: item.agentRun.id,
        jobId: item.job.id,
        claimId: item.claim.id,
        requestId,
        message: error instanceof Error ? error.message : "Worker crashed"
      })
    );
  } finally {
    if (heartbeat) {
      clearInterval(heartbeat);
    }
  }
}

async function main() {
  while (true) {
    await processOneJob();
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
