import type { ClaimDetail } from "@tenio/domain";
import type { ExecutionCandidate, ExecutionFailureCategory } from "@tenio/contracts";

type ReservedJob = {
  item: {
    job: {
      id: string;
      claimId: string;
      attempts: number;
      maxAttempts: number;
      status: string;
    };
    claim: ClaimDetail;
  } | null;
};

export class WorkflowApiClient {
  constructor(
    private readonly baseUrl = process.env.TENIO_API_BASE_URL ?? "http://127.0.0.1:4000",
    private readonly workerToken =
      process.env.TENIO_WORKER_SERVICE_TOKEN ?? "tenio-local-worker-service-token"
  ) {}

  private getHeaders(requestId?: string) {
    return {
      "content-type": "application/json",
      "x-tenio-service-token": this.workerToken,
      ...(requestId ? { "x-request-id": requestId } : {})
    };
  }

  async claimNextJob(workerName: string, requestId?: string) {
    const response = await fetch(`${this.baseUrl}/internal/retrieval-jobs/claim`, {
      method: "POST",
      headers: this.getHeaders(requestId),
      body: JSON.stringify({ workerName })
    });

    if (!response.ok) {
      throw new Error(`Failed to claim job: ${response.status}`);
    }

    return (await response.json()) as ReservedJob;
  }

  async completeJob(
    jobId: string,
    claimId: string,
    candidate: ExecutionCandidate,
    requestId?: string
  ) {
    const response = await fetch(
      `${this.baseUrl}/internal/retrieval-jobs/${jobId}/complete`,
      {
        method: "POST",
        headers: this.getHeaders(requestId),
        body: JSON.stringify({ claimId, candidate })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to complete job ${jobId}: ${response.status}`);
    }

    return response.json();
  }

  async failJob(
    jobId: string,
    failure: {
      error: string;
      failureCategory?: ExecutionFailureCategory;
      retryable?: boolean;
      connectorId?: string;
      connectorName?: string;
      observedAt?: string;
      durationMs?: number;
    },
    requestId?: string
  ) {
    const response = await fetch(`${this.baseUrl}/internal/retrieval-jobs/${jobId}/fail`, {
      method: "POST",
      headers: this.getHeaders(requestId),
      body: JSON.stringify(failure)
    });

    if (!response.ok) {
      throw new Error(`Failed to mark job ${jobId} as failed: ${response.status}`);
    }

    return response.json();
  }
}
