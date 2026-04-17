import {
  agentObservationSchema,
  type AgentObservation
} from "@tenio/contracts";

export class ConnectorServiceClient {
  constructor(
    private readonly baseUrl =
      process.env.TENIO_CONNECTOR_SERVICE_URL ?? "http://localhost:8100",
    private readonly serviceToken =
      process.env.TENIO_CONNECTOR_SERVICE_TOKEN ??
      "tenio-local-connector-service-token"
  ) {}

  private getHeaders(requestId?: string): Record<string, string> {
    return {
      "content-type": "application/json",
      "x-tenio-service-token": this.serviceToken,
      ...(requestId ? { "x-request-id": requestId } : {})
    };
  }

  /**
   * Calls POST /v1/execute on the connector service and returns the
   * resulting AgentObservation, or null if the request fails.
   */
  async execute(
    payload: {
      connectorId: string;
      mode: "api" | "browser";
      orgId: string;
      claimContext: {
        claimId: string;
        claimNumber: string;
        orgId: string;
        payerId: string;
        serviceDate: string | null;
        billedAmountCents: number | null;
        planNumber: string | null;
        memberCertificate: string | null;
        provinceOfService: string | null;
        serviceCode: string | null;
      };
    },
    requestId?: string
  ): Promise<AgentObservation | null> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/execute`, {
        method: "POST",
        headers: this.getHeaders(requestId),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000)
      });

      if (!response.ok) {
        console.warn(
          JSON.stringify({
            source: "ConnectorServiceClient",
            status: "http_error",
            httpStatus: response.status,
            connectorId: payload.connectorId,
            requestId
          })
        );
        return null;
      }

      return agentObservationSchema.parse(await response.json());
    } catch (err) {
      console.warn(
        JSON.stringify({
          source: "ConnectorServiceClient",
          status: "request_failed",
          connectorId: payload.connectorId,
          message: err instanceof Error ? err.message : "Unknown error",
          requestId
        })
      );
      return null;
    }
  }
}
