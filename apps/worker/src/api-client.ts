import type { ClaimDetail } from "@tenio/domain";
import type {
  AgentRunBudget,
  AgentRunTerminalReason,
  AgentStepHistoryItem,
  AgentStepResult,
  AgentToolName,
  ConnectorMode,
  ExecutionCandidate,
  ExecutionFailureCategory
} from "@tenio/contracts";

export type AgentRunState = {
  id: string;
  status: "running" | "completed" | "retry_scheduled" | "review_required" | "failed";
  protocolVersion: 1;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  heartbeatAt: string | null;
  startedAt: string;
  completedAt: string | null;
  modelProvider: string | null;
  modelName: string | null;
  modelCallsUsed: number;
  inputTokensUsed: number;
  outputTokensUsed: number;
  totalTokensUsed: number;
  connectorSwitchCount: number;
  budget: AgentRunBudget;
  terminalReason: AgentRunTerminalReason | null;
  lastError: string | null;
  steps: AgentStepHistoryItem[];
};

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
    agentRun: AgentRunState;
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

  async heartbeatAgentRun(runId: string, workerName: string, requestId?: string) {
    const response = await fetch(`${this.baseUrl}/internal/agent-runs/${runId}/heartbeat`, {
      method: "POST",
      headers: this.getHeaders(requestId),
      body: JSON.stringify({ workerName })
    });

    if (!response.ok) {
      throw new Error(`Failed to heartbeat agent run ${runId}: ${response.status}`);
    }

    return (await response.json()) as { item: AgentRunState | null };
  }

  async startAgentToolStep(
    runId: string,
    payload: {
      workerName: string;
      stepNumber: number;
      toolName: AgentToolName;
      toolArgs: {
        connectorId: string;
        mode: ConnectorMode;
        attemptLabel: string;
      };
      publicReason: string;
      idempotencyKey: string;
      plannerUsage: {
        provider: string;
        model: string;
        inputTokens: number;
        outputTokens: number;
      };
    },
    requestId?: string
  ) {
    const response = await fetch(`${this.baseUrl}/internal/agent-runs/${runId}/steps/start`, {
      method: "POST",
      headers: this.getHeaders(requestId),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to start agent step for run ${runId}: ${response.status}`);
    }

    return (await response.json()) as {
      item: { run: AgentRunState; step: AgentStepHistoryItem } | null;
    };
  }

  async completeAgentToolStep(
    runId: string,
    stepNumber: number,
    payload: {
      workerName: string;
      result: AgentStepResult;
    },
    requestId?: string
  ) {
    const response = await fetch(
      `${this.baseUrl}/internal/agent-runs/${runId}/steps/${stepNumber}/complete`,
      {
        method: "POST",
        headers: this.getHeaders(requestId),
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to complete agent step ${stepNumber} for run ${runId}: ${response.status}`);
    }

    return (await response.json()) as {
      item: { run: AgentRunState; step: AgentStepHistoryItem } | null;
    };
  }

  async recordAgentTerminalStep(
    runId: string,
    payload: {
      workerName: string;
      stepNumber: number;
      directiveKind: "final" | "retry";
      publicReason: string;
      idempotencyKey: string;
      plannerUsage: {
        provider: string;
        model: string;
        inputTokens: number;
        outputTokens: number;
      };
      summary: string;
      terminalReason: AgentRunTerminalReason;
      finalCandidate?: ExecutionCandidate | null;
      retryAfterSeconds?: number | null;
    },
    requestId?: string
  ) {
    const response = await fetch(`${this.baseUrl}/internal/agent-runs/${runId}/steps/terminal`, {
      method: "POST",
      headers: this.getHeaders(requestId),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to record terminal agent step for run ${runId}: ${response.status}`);
    }

    return (await response.json()) as {
      item: { run: AgentRunState; step: AgentStepHistoryItem } | null;
    };
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
      retryAfterSeconds?: number;
      connectorId?: string;
      connectorName?: string;
      executionMode?: ConnectorMode;
      observedAt?: string;
      durationMs?: number;
      terminalReason?: AgentRunTerminalReason;
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
