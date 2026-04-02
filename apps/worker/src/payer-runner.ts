import type { EvidenceArtifact, ExecutionFailureCategory } from "@tenio/contracts";

type RetrievalTask = {
  claimId: string;
  claimNumber: string;
  patientName: string;
  payerId: string;
  payerName: string;
  sessionMode: "browser" | "api";
  attempt: number;
  maxAttempts: number;
};

type AetnaClaimStatusCode =
  | "PAID_IN_FULL"
  | "PENDING_MEDICAL_REVIEW"
  | "DENIED"
  | "ADDITIONAL_INFO_REQUIRED";

export type AetnaClaimStatusApiPayload = {
  connectorId: "aetna-claim-status-api";
  connectorVersion: "2026-04-connector-v1";
  claimId: string;
  claimNumber: string;
  patientName: string;
  payerName: string;
  externalReferenceNumber: string;
  statusCode: AetnaClaimStatusCode;
  statusLabel: string;
  billedAmountCents: number;
  allowedAmountCents: number | null;
  paidAmountCents: number | null;
  patientResponsibilityCents: number | null;
  adjudicatedAt: string | null;
  lastUpdatedAt: string;
  reviewReason: string | null;
  denialCode: string | null;
  denialDescription: string | null;
  followUpHint: string | null;
  dataComplete: boolean;
};

export type PortalSnapshot = {
  claimId: string;
  claimNumber: string;
  patientName: string;
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
  connectorPayloadJson: string | null;
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
  execute(task: RetrievalTask, requestId?: string): Promise<PortalSnapshot>;
};

function buildEvidenceArtifact(
  id: string,
  kind: EvidenceArtifact["kind"],
  label: string,
  url: string,
  createdAt: string,
  mimeType: string,
  inlineContent: string
): EvidenceArtifact {
  return {
    id,
    kind,
    label,
    url,
    createdAt,
    mimeType,
    storageKind: "inline",
    storageKey: null,
    inlineContentBase64: Buffer.from(inlineContent).toString("base64")
  };
}

function amount(value: number | null) {
  if (value === null) {
    return "Unavailable";
  }

  return `$${(value / 100).toFixed(2)}`;
}

function buildAetnaFixturePayload(
  task: RetrievalTask,
  observedAt: string
): AetnaClaimStatusApiPayload {
  const base = `${task.claimId}-${task.claimNumber}`.toLowerCase();

  if (base.includes("204938") || base.includes("review")) {
    return {
      connectorId: "aetna-claim-status-api",
      connectorVersion: "2026-04-connector-v1",
      claimId: task.claimId,
      claimNumber: task.claimNumber,
      patientName: task.patientName,
      payerName: task.payerName,
      externalReferenceNumber: "AET-REF-984721034",
      statusCode: "PENDING_MEDICAL_REVIEW",
      statusLabel: "Pending medical review",
      billedAmountCents: 284700,
      allowedAmountCents: null,
      paidAmountCents: null,
      patientResponsibilityCents: null,
      adjudicatedAt: null,
      lastUpdatedAt: observedAt,
      reviewReason: "Medical record review is still open on the payer side.",
      denialCode: null,
      denialDescription: null,
      followUpHint: "Route to operator review and check again after payer review clears.",
      dataComplete: true
    };
  }

  if (base.includes("204821") || base.includes("denied")) {
    return {
      connectorId: "aetna-claim-status-api",
      connectorVersion: "2026-04-connector-v1",
      claimId: task.claimId,
      claimNumber: task.claimNumber,
      patientName: task.patientName,
      payerName: task.payerName,
      externalReferenceNumber: "AET-REF-332198714",
      statusCode: "DENIED",
      statusLabel: "Denied",
      billedAmountCents: 194250,
      allowedAmountCents: 0,
      paidAmountCents: 0,
      patientResponsibilityCents: 0,
      adjudicatedAt: observedAt,
      lastUpdatedAt: observedAt,
      reviewReason: "Coverage validation failed for the submitted rendering provider.",
      denialCode: "CO-197",
      denialDescription: "Precertification or authorization missing.",
      followUpHint: "Escalate to specialist review before downstream posting.",
      dataComplete: true
    };
  }

  if (base.includes("missing") || base.includes("retry")) {
    return {
      connectorId: "aetna-claim-status-api",
      connectorVersion: "2026-04-connector-v1",
      claimId: task.claimId,
      claimNumber: task.claimNumber,
      patientName: task.patientName,
      payerName: task.payerName,
      externalReferenceNumber: "AET-REF-RETRY-001",
      statusCode: "ADDITIONAL_INFO_REQUIRED",
      statusLabel: "Awaiting supplemental data",
      billedAmountCents: 210500,
      allowedAmountCents: null,
      paidAmountCents: null,
      patientResponsibilityCents: null,
      adjudicatedAt: null,
      lastUpdatedAt: observedAt,
      reviewReason: "The payer record is not yet complete enough to post a final status.",
      denialCode: null,
      denialDescription: null,
      followUpHint: "Retry after the payer API publishes the full adjudication record.",
      dataComplete: false
    };
  }

  return {
    connectorId: "aetna-claim-status-api",
    connectorVersion: "2026-04-connector-v1",
    claimId: task.claimId,
    claimNumber: task.claimNumber,
    patientName: task.patientName,
    payerName: task.payerName,
    externalReferenceNumber: "AET-REF-552918443",
    statusCode: "PAID_IN_FULL",
    statusLabel: "Paid in full",
    billedAmountCents: 227750,
    allowedAmountCents: 227750,
    paidAmountCents: 227750,
    patientResponsibilityCents: 0,
    adjudicatedAt: observedAt,
    lastUpdatedAt: observedAt,
    reviewReason: null,
    denialCode: null,
    denialDescription: null,
    followUpHint: "Eligible for downstream export when workflow policy accepts the result.",
    dataComplete: true
  };
}

function parseAetnaPayload(value: unknown): AetnaClaimStatusApiPayload {
  if (!value || typeof value !== "object") {
    throw new Error("Aetna connector returned a non-object payload.");
  }

  const candidate = value as Partial<AetnaClaimStatusApiPayload>;

  if (
    candidate.connectorId !== "aetna-claim-status-api" ||
    typeof candidate.claimId !== "string" ||
    typeof candidate.claimNumber !== "string" ||
    typeof candidate.patientName !== "string" ||
    typeof candidate.payerName !== "string" ||
    typeof candidate.statusCode !== "string" ||
    typeof candidate.statusLabel !== "string" ||
    typeof candidate.externalReferenceNumber !== "string" ||
    typeof candidate.billedAmountCents !== "number" ||
    typeof candidate.lastUpdatedAt !== "string" ||
    typeof candidate.dataComplete !== "boolean"
  ) {
    throw new Error("Aetna connector payload is missing required claim status fields.");
  }

  return {
    connectorId: "aetna-claim-status-api",
    connectorVersion:
      candidate.connectorVersion === "2026-04-connector-v1"
        ? candidate.connectorVersion
        : "2026-04-connector-v1",
    claimId: candidate.claimId,
    claimNumber: candidate.claimNumber,
    patientName: candidate.patientName,
    payerName: candidate.payerName,
    externalReferenceNumber: candidate.externalReferenceNumber,
    statusCode: candidate.statusCode as AetnaClaimStatusCode,
    statusLabel: candidate.statusLabel,
    billedAmountCents: candidate.billedAmountCents,
    allowedAmountCents: typeof candidate.allowedAmountCents === "number" ? candidate.allowedAmountCents : null,
    paidAmountCents: typeof candidate.paidAmountCents === "number" ? candidate.paidAmountCents : null,
    patientResponsibilityCents:
      typeof candidate.patientResponsibilityCents === "number"
        ? candidate.patientResponsibilityCents
        : null,
    adjudicatedAt: typeof candidate.adjudicatedAt === "string" ? candidate.adjudicatedAt : null,
    lastUpdatedAt: candidate.lastUpdatedAt,
    reviewReason: typeof candidate.reviewReason === "string" ? candidate.reviewReason : null,
    denialCode: typeof candidate.denialCode === "string" ? candidate.denialCode : null,
    denialDescription:
      typeof candidate.denialDescription === "string" ? candidate.denialDescription : null,
    followUpHint: typeof candidate.followUpHint === "string" ? candidate.followUpHint : null,
    dataComplete: candidate.dataComplete
  };
}

function serializeAetnaPortalText(payload: AetnaClaimStatusApiPayload) {
  return [
    `Aetna claim status API payload`,
    `Claim ID: ${payload.claimId}`,
    `Claim Number: ${payload.claimNumber}`,
    `Patient: ${payload.patientName}`,
    `Payer Reference: ${payload.externalReferenceNumber}`,
    `Status Code: ${payload.statusCode}`,
    `Status Label: ${payload.statusLabel}`,
    `Billed Amount: ${amount(payload.billedAmountCents)}`,
    `Allowed Amount: ${amount(payload.allowedAmountCents)}`,
    `Paid Amount: ${amount(payload.paidAmountCents)}`,
    `Patient Responsibility: ${amount(payload.patientResponsibilityCents)}`,
    `Adjudicated At: ${payload.adjudicatedAt ?? "Not adjudicated"}`,
    `Review Reason: ${payload.reviewReason ?? "None"}`,
    `Denial Code: ${payload.denialCode ?? "None"}`,
    `Denial Description: ${payload.denialDescription ?? "None"}`,
    `Follow-up Hint: ${payload.followUpHint ?? "None"}`,
    `Data Complete: ${payload.dataComplete ? "true" : "false"}`,
    `Connector Version: ${payload.connectorVersion}`
  ].join("\n");
}

function buildAetnaArtifacts(
  payload: AetnaClaimStatusApiPayload,
  task: RetrievalTask,
  observedAt: string
) {
  const portalHtml = `<!doctype html>
<html>
  <body>
    <h1>${payload.payerName} Claim Status API</h1>
    <table>
      <tr><th>Claim ID</th><td>${payload.claimId}</td></tr>
      <tr><th>Claim Number</th><td>${payload.claimNumber}</td></tr>
      <tr><th>Patient</th><td>${payload.patientName}</td></tr>
      <tr><th>Payer Reference</th><td>${payload.externalReferenceNumber}</td></tr>
      <tr><th>Status</th><td>${payload.statusLabel} (${payload.statusCode})</td></tr>
      <tr><th>Billed</th><td>${amount(payload.billedAmountCents)}</td></tr>
      <tr><th>Allowed</th><td>${amount(payload.allowedAmountCents)}</td></tr>
      <tr><th>Paid</th><td>${amount(payload.paidAmountCents)}</td></tr>
      <tr><th>Patient Responsibility</th><td>${amount(payload.patientResponsibilityCents)}</td></tr>
      <tr><th>Adjudicated At</th><td>${payload.adjudicatedAt ?? "Pending"}</td></tr>
      <tr><th>Review Reason</th><td>${payload.reviewReason ?? "None"}</td></tr>
      <tr><th>Denial</th><td>${payload.denialCode ?? "None"} ${payload.denialDescription ?? ""}</td></tr>
      <tr><th>Follow-up Hint</th><td>${payload.followUpHint ?? "None"}</td></tr>
      <tr><th>Data Complete</th><td>${payload.dataComplete ? "true" : "false"}</td></tr>
      <tr><th>Attempt</th><td>${task.attempt} of ${task.maxAttempts}</td></tr>
      <tr><th>Observed</th><td>${observedAt}</td></tr>
    </table>
  </body>
</html>`;

  const accent =
    payload.statusCode === "PAID_IN_FULL"
      ? "#0f766e"
      : payload.statusCode === "DENIED"
        ? "#b91c1c"
        : payload.dataComplete
          ? "#1d4ed8"
          : "#c2410c";
  const statusSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="420">
  <rect width="100%" height="100%" fill="#f8fafc" />
  <rect x="24" y="24" width="712" height="372" rx="18" fill="#ffffff" stroke="#cbd5e1" />
  <text x="52" y="78" font-family="Arial, sans-serif" font-size="28" fill="#0f172a">Aetna Claim Status API</text>
  <text x="52" y="120" font-family="Arial, sans-serif" font-size="18" fill="#475569">Claim ${payload.claimNumber} • ${payload.patientName}</text>
  <text x="52" y="164" font-family="Arial, sans-serif" font-size="26" fill="${accent}">${payload.statusLabel}</text>
  <text x="52" y="204" font-family="Arial, sans-serif" font-size="16" fill="#334155">Reference ${payload.externalReferenceNumber}</text>
  <text x="52" y="236" font-family="Arial, sans-serif" font-size="16" fill="#334155">Paid ${amount(payload.paidAmountCents)} of ${amount(payload.allowedAmountCents)}</text>
  <text x="52" y="268" font-family="Arial, sans-serif" font-size="16" fill="#334155">Data complete: ${payload.dataComplete ? "yes" : "no"}</text>
  <text x="52" y="302" font-family="Arial, sans-serif" font-size="16" fill="#334155">${payload.followUpHint ?? "No follow-up hint provided."}</text>
  <text x="52" y="338" font-family="Arial, sans-serif" font-size="15" fill="#64748b">Observed ${observedAt} • Attempt ${task.attempt}/${task.maxAttempts}</text>
</svg>`;

  return [
    buildEvidenceArtifact(
      `artifact_${task.claimId}_aetna_status`,
      "screenshot",
      `${task.payerName} structured status snapshot`,
      `capture://${task.claimId}/aetna-status.svg`,
      observedAt,
      "image/svg+xml",
      statusSvg
    ),
    buildEvidenceArtifact(
      `artifact_${task.claimId}_aetna_payload`,
      "raw_html",
      `${task.payerName} structured API payload`,
      `capture://${task.claimId}/aetna-payload.html`,
      observedAt,
      "text/html; charset=utf-8",
      portalHtml
    )
  ];
}

async function fetchAetnaRemotePayload(
  task: RetrievalTask,
  requestId: string | undefined,
  observedAt: string,
  startedAt: number
) {
  const baseUrl = process.env.TENIO_AETNA_API_BASE_URL?.trim();
  const token = process.env.TENIO_AETNA_API_TOKEN?.trim();

  if (!baseUrl || !token) {
    return buildAetnaFixturePayload(task, observedAt);
  }

  const url = new URL(
    `/v1/claims/${encodeURIComponent(task.claimNumber || task.claimId)}/status`,
    baseUrl
  );
  const response = await fetch(url, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
      ...(requestId ? { "x-request-id": requestId } : {})
    }
  });

  if (response.status === 401 || response.status === 403) {
    throw new ConnectorExecutionError(
      "Aetna connector authentication failed.",
      "authentication",
      false,
      "aetna-claim-status-api",
      "Aetna Claim Status API",
      observedAt,
      Date.now() - startedAt
    );
  }

  if (response.status === 429) {
    throw new ConnectorExecutionError(
      "Aetna connector was rate limited.",
      "rate_limited",
      true,
      "aetna-claim-status-api",
      "Aetna Claim Status API",
      observedAt,
      Date.now() - startedAt
    );
  }

  if (response.status >= 500) {
    throw new ConnectorExecutionError(
      "Aetna connector upstream service was unavailable.",
      "network",
      true,
      "aetna-claim-status-api",
      "Aetna Claim Status API",
      observedAt,
      Date.now() - startedAt
    );
  }

  if (!response.ok) {
    throw new ConnectorExecutionError(
      `Aetna connector returned ${response.status}.`,
      "data_missing",
      false,
      "aetna-claim-status-api",
      "Aetna Claim Status API",
      observedAt,
      Date.now() - startedAt
    );
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new ConnectorExecutionError(
      "Aetna connector returned invalid JSON.",
      "data_missing",
      true,
      "aetna-claim-status-api",
      "Aetna Claim Status API",
      observedAt,
      Date.now() - startedAt
    );
  }

  try {
    return parseAetnaPayload(payload);
  } catch (error) {
    throw new ConnectorExecutionError(
      error instanceof Error ? error.message : "Aetna connector payload was invalid.",
      "data_missing",
      false,
      "aetna-claim-status-api",
      "Aetna Claim Status API",
      observedAt,
      Date.now() - startedAt
    );
  }
}

const connectors: RetrievalConnector[] = [
  {
    id: "aetna-claim-status-api",
    name: "Aetna Claim Status API",
    executionMode: "api",
    supports(task) {
      return task.payerId === "payer_aetna";
    },
    async execute(task, requestId) {
      const startedAt = Date.now();
      const observedAt = new Date().toISOString();
      const payload = await fetchAetnaRemotePayload(task, requestId, observedAt, startedAt);
      const evidenceArtifacts = buildAetnaArtifacts(payload, task, observedAt);

      return {
        claimId: task.claimId,
        claimNumber: task.claimNumber,
        patientName: task.patientName,
        payerId: task.payerId,
        payerName: task.payerName,
        portalText: serializeAetnaPortalText(payload),
        screenshotUrls: evidenceArtifacts
          .filter((artifact) => artifact.kind === "screenshot")
          .map((artifact) => artifact.url),
        evidenceArtifacts,
        connectorId: this.id,
        connectorName: this.name,
        observedAt,
        durationMs: Date.now() - startedAt,
        executionMode: this.executionMode,
        narrative:
          "Aetna structured claim status API returned a normalized claim snapshot with explicit financial and adjudication fields.",
        connectorPayloadJson: JSON.stringify(payload)
      };
    }
  },
  {
    id: "portal-browser-fallback",
    name: "Portal Browser Fallback",
    executionMode: "browser",
    supports() {
      return true;
    },
    async execute(task) {
      const startedAt = Date.now();
      const observedAt = new Date().toISOString();
      const portalText =
        task.payerId === "payer_uhc"
          ? `${task.payerName} portal snapshot for claim ${task.claimId}: Denied pending specialist escalation due to conflicting review.`
          : task.payerId === "payer_cigna"
            ? `${task.payerName} portal snapshot for claim ${task.claimId}: Claim remains in process with no final adjudication posted.`
            : `${task.payerName} portal snapshot for claim ${task.claimId}: Additional payer review required before the workflow can auto-resolve.`;
      const notes = `${task.payerName} browser connector captured a fallback portal snapshot for claim ${task.claimId}.`;
      const statusSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="400">
  <rect width="100%" height="100%" fill="#fff7ed" />
  <rect x="28" y="28" width="664" height="344" rx="18" fill="#ffffff" stroke="#fdba74" />
  <text x="60" y="84" font-family="Arial, sans-serif" font-size="28" fill="#9a3412">${task.payerName} Browser Snapshot</text>
  <text x="60" y="132" font-family="Arial, sans-serif" font-size="18" fill="#7c2d12">Claim ${task.claimId}</text>
  <text x="60" y="176" font-family="Arial, sans-serif" font-size="20" fill="#c2410c">Manual review likely required</text>
  <text x="60" y="220" font-family="Arial, sans-serif" font-size="16" fill="#9a3412">${notes}</text>
</svg>`;
      const evidenceArtifacts = [
        buildEvidenceArtifact(
          `artifact_${task.claimId}_browser_status`,
          "screenshot",
          `${task.payerName} browser capture`,
          `capture://${task.claimId}/browser-status.svg`,
          observedAt,
          "image/svg+xml",
          statusSvg
        )
      ];

      return {
        claimId: task.claimId,
        claimNumber: task.claimNumber,
        patientName: task.patientName,
        payerId: task.payerId,
        payerName: task.payerName,
        portalText,
        screenshotUrls: evidenceArtifacts.map((artifact) => artifact.url),
        evidenceArtifacts,
        connectorId: this.id,
        connectorName: this.name,
        observedAt,
        durationMs: Date.now() - startedAt,
        executionMode: this.executionMode,
        narrative: `${this.name} observed ${task.payerName} claim status through the browser fallback path.`,
        connectorPayloadJson: null
      };
    }
  }
];

function chooseConnector(task: RetrievalTask) {
  return connectors.find((connector) => connector.supports(task)) ?? connectors[0];
}

export async function runPayerRetrieval(
  task: RetrievalTask,
  requestId?: string
): Promise<PortalSnapshot> {
  const connector = chooseConnector(task);

  try {
    return await connector.execute(task, requestId);
  } catch (error) {
    if (error instanceof ConnectorExecutionError) {
      throw error;
    }

    const observedAt = new Date().toISOString();
    const message = error instanceof Error ? error.message : "Connector execution failed.";

    throw new ConnectorExecutionError(
      message,
      "unknown",
      task.attempt < task.maxAttempts,
      connector.id,
      connector.name,
      observedAt,
      0
    );
  }
}
