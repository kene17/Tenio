import type { EvidenceArtifact, ExecutionFailureCategory } from "@tenio/contracts";

type RetrievalTask = {
  claimId: string;
  payerId: string;
  payerName: string;
  sessionMode: "browser" | "api";
  attempt: number;
  maxAttempts: number;
};

export type PortalSnapshot = {
  claimId: string;
  payerId: string;
  payerName: string;
  portalText: string;
  screenshotUrls: string[];
  evidenceArtifacts: EvidenceArtifact[];
  connectorId: string;
  connectorName: string;
  observedAt: string;
  durationMs: number;
  executionMode: "browser" | "api";
  narrative: string;
};

export class ConnectorExecutionError extends Error {
  constructor(
    message: string,
    readonly failureCategory: ExecutionFailureCategory,
    readonly retryable: boolean,
    readonly connectorId: string,
    readonly connectorName: string,
    readonly observedAt: string,
    readonly durationMs: number
  ) {
    super(message);
  }
}

type RetrievalConnector = {
  id: string;
  name: string;
  executionMode: "browser" | "api";
  supports(task: RetrievalTask): boolean;
  getPortalText(task: RetrievalTask): string;
  buildArtifacts(task: RetrievalTask, observedAt: string): EvidenceArtifact[];
};

const connectors: RetrievalConnector[] = [
  {
    id: "payer-api-feed",
    name: "Payer API Feed",
    executionMode: "api",
    supports(task) {
      return task.payerId === "payer_aetna" || task.payerId === "payer_humana";
    },
    getPortalText(task) {
      if (task.payerId === "payer_humana") {
        return `${task.payerName} API response for claim ${task.claimId}: Paid in full and ready for export.`;
      }

      return `${task.payerName} API response for claim ${task.claimId}: Pending payer review with additional contract validation.`;
    },
    buildArtifacts(task, observedAt) {
      const portalHtml = `<!doctype html>
<html>
  <body>
    <h1>${task.payerName} API status</h1>
    <p>Claim ${task.claimId}</p>
    <p>Status: Pending payer review with contract validation</p>
    <p>Attempt ${task.attempt} of ${task.maxAttempts}</p>
    <p>Observed ${observedAt}</p>
  </body>
</html>`;

      const statusSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="400">
  <rect width="100%" height="100%" fill="#f8fafc" />
  <rect x="28" y="28" width="664" height="344" rx="18" fill="#ffffff" stroke="#cbd5e1" />
  <text x="60" y="84" font-family="Arial, sans-serif" font-size="28" fill="#0f172a">${task.payerName} API Claim Status</text>
  <text x="60" y="132" font-family="Arial, sans-serif" font-size="18" fill="#334155">Claim ${task.claimId}</text>
  <text x="60" y="172" font-family="Arial, sans-serif" font-size="20" fill="#1d4ed8">Pending payer review</text>
  <text x="60" y="214" font-family="Arial, sans-serif" font-size="16" fill="#475569">Attempt ${task.attempt} of ${task.maxAttempts}</text>
  <text x="60" y="248" font-family="Arial, sans-serif" font-size="16" fill="#475569">Observed ${observedAt}</text>
</svg>`;

      return [
        {
          id: `artifact_${task.claimId}_status`,
          kind: "screenshot",
          label: `${task.payerName} status screenshot`,
          url: `capture://${task.claimId}/status.svg`,
          createdAt: observedAt,
          mimeType: "image/svg+xml",
          storageKind: "inline",
          storageKey: null,
          inlineContentBase64: Buffer.from(statusSvg).toString("base64")
        },
        {
          id: `artifact_${task.claimId}_portal_html`,
          kind: "raw_html",
          label: `${task.payerName} portal response`,
          url: `capture://${task.claimId}/portal.html`,
          createdAt: observedAt,
          mimeType: "text/html; charset=utf-8",
          storageKind: "inline",
          storageKey: null,
          inlineContentBase64: Buffer.from(portalHtml).toString("base64")
        }
      ];
    }
  },
  {
    id: "portal-browser-fallback",
    name: "Portal Browser Fallback",
    executionMode: "browser",
    supports() {
      return true;
    },
    getPortalText(task) {
      if (task.payerId === "payer_uhc") {
        return `${task.payerName} portal snapshot for claim ${task.claimId}: Denied pending specialist escalation due to conflicting review.`;
      }

      if (task.payerId === "payer_cigna") {
        return `${task.payerName} portal snapshot for claim ${task.claimId}: Claim remains in process with no final adjudication posted.`;
      }

      return `${task.payerName} portal snapshot for claim ${task.claimId}: Additional payer review required before the workflow can auto-resolve.`;
    },
    buildArtifacts(task, observedAt) {
      const notes = `${task.payerName} browser connector captured a fallback portal snapshot for claim ${task.claimId}.`;
      const statusSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="400">
  <rect width="100%" height="100%" fill="#fff7ed" />
  <rect x="28" y="28" width="664" height="344" rx="18" fill="#ffffff" stroke="#fdba74" />
  <text x="60" y="84" font-family="Arial, sans-serif" font-size="28" fill="#9a3412">${task.payerName} Browser Snapshot</text>
  <text x="60" y="132" font-family="Arial, sans-serif" font-size="18" fill="#7c2d12">Claim ${task.claimId}</text>
  <text x="60" y="176" font-family="Arial, sans-serif" font-size="20" fill="#c2410c">Manual review likely required</text>
  <text x="60" y="220" font-family="Arial, sans-serif" font-size="16" fill="#9a3412">${notes}</text>
</svg>`;

      return [
        {
          id: `artifact_${task.claimId}_browser_status`,
          kind: "screenshot",
          label: `${task.payerName} browser capture`,
          url: `capture://${task.claimId}/browser-status.svg`,
          createdAt: observedAt,
          mimeType: "image/svg+xml",
          storageKind: "inline",
          storageKey: null,
          inlineContentBase64: Buffer.from(statusSvg).toString("base64")
        }
      ];
    }
  }
];

function chooseConnector(task: RetrievalTask) {
  return connectors.find((connector) => connector.supports(task)) ?? connectors[0];
}

export async function runPayerRetrieval(task: RetrievalTask): Promise<PortalSnapshot> {
  const connector = chooseConnector(task);
  const startedAt = Date.now();
  const observedAt = new Date().toISOString();

  try {
    const evidenceArtifacts = connector.buildArtifacts(task, observedAt);

    return {
      claimId: task.claimId,
      payerId: task.payerId,
      payerName: task.payerName,
      portalText: connector.getPortalText(task),
      screenshotUrls: evidenceArtifacts
        .filter((artifact) => artifact.kind === "screenshot")
        .map((artifact) => artifact.url),
      evidenceArtifacts,
      connectorId: connector.id,
      connectorName: connector.name,
      observedAt,
      durationMs: Date.now() - startedAt,
      executionMode: connector.executionMode,
      narrative: `${connector.name} observed ${task.payerName} claim status through the ${connector.executionMode} execution path.`
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connector execution failed.";

    throw new ConnectorExecutionError(
      message,
      "unknown",
      task.attempt < task.maxAttempts,
      connector.id,
      connector.name,
      observedAt,
      Date.now() - startedAt
    );
  }
}
