import Fastify from "fastify";

import { executeTelusEclaims, telusExecuteRequestSchema } from "./telus.js";
import { executeSunLifePshcp, sunLifeExecuteRequestSchema } from "./sun-life.js";
import { executeManulife, manulifeExecuteRequestSchema } from "./manulife.js";
import { executeCanadaLife, canadaLifeExecuteRequestSchema } from "./canada-life.js";
import { executeGreenShield, greenShieldExecuteRequestSchema } from "./green-shield.js";

const CONNECTOR_SERVICE_TOKEN =
  process.env.TENIO_CONNECTOR_SERVICE_TOKEN ??
  "tenio-local-connector-service-token";

const port = Number(process.env.PORT ?? 8100);
const host = process.env.HOST ?? "0.0.0.0";

const app = Fastify({
  logger: true,
  disableRequestLogging: true
});

app.addHook("onRequest", async (request, reply) => {
  if (request.url === "/health") return;

  const token = request.headers["x-tenio-service-token"];
  if (token !== CONNECTOR_SERVICE_TOKEN) {
    return reply.code(403).send({ message: "Forbidden" });
  }
});

app.get("/health", async () => ({
  ok: true,
  service: "connectors"
}));

app.post("/v1/execute", async (request, reply) => {
  const body = request.body as { connectorId?: unknown };
  const connectorId =
    typeof body?.connectorId === "string" ? body.connectorId : null;

  // ── TELUS eClaims API connector ───────────────────────────────────────────
  if (connectorId === "telus-eclaims-api") {
    const parsed = telusExecuteRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: "Invalid request body for telus-eclaims-api",
        errors: parsed.error.flatten().fieldErrors
      });
    }
    try {
      return await executeTelusEclaims(parsed.data);
    } catch (err) {
      app.log.error(
        { err: err instanceof Error ? err.message : String(err) },
        "Unhandled error in /v1/execute [telus-eclaims-api]"
      );
      return reply.code(500).send({ message: "Internal connector error" });
    }
  }

  // ── Sun Life PSHCP browser connector ─────────────────────────────────────
  if (connectorId === "sun-life-pshcp-browser") {
    const parsed = sunLifeExecuteRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: "Invalid request body for sun-life-pshcp-browser",
        errors: parsed.error.flatten().fieldErrors
      });
    }
    try {
      return await executeSunLifePshcp(parsed.data);
    } catch (err) {
      app.log.error(
        { err: err instanceof Error ? err.message : String(err) },
        "Unhandled error in /v1/execute [sun-life-pshcp-browser]"
      );
      return reply.code(500).send({ message: "Internal connector error" });
    }
  }

  // ── Manulife Group Benefits browser connector ─────────────────────────────
  if (connectorId === "manulife-groupbenefits-browser") {
    const parsed = manulifeExecuteRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: "Invalid request body for manulife-groupbenefits-browser",
        errors: parsed.error.flatten().fieldErrors
      });
    }
    try {
      return await executeManulife(parsed.data);
    } catch (err) {
      app.log.error(
        { err: err instanceof Error ? err.message : String(err) },
        "Unhandled error in /v1/execute [manulife-groupbenefits-browser]"
      );
      return reply.code(500).send({ message: "Internal connector error" });
    }
  }

  // ── Canada Life GroupNet browser connector ────────────────────────────────
  if (connectorId === "canada-life-groupnet-browser") {
    const parsed = canadaLifeExecuteRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: "Invalid request body for canada-life-groupnet-browser",
        errors: parsed.error.flatten().fieldErrors
      });
    }
    try {
      return await executeCanadaLife(parsed.data);
    } catch (err) {
      app.log.error(
        { err: err instanceof Error ? err.message : String(err) },
        "Unhandled error in /v1/execute [canada-life-groupnet-browser]"
      );
      return reply.code(500).send({ message: "Internal connector error" });
    }
  }

  // ── Green Shield Canada browser connector ─────────────────────────────────
  if (connectorId === "green-shield-provider-browser") {
    const parsed = greenShieldExecuteRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: "Invalid request body for green-shield-provider-browser",
        errors: parsed.error.flatten().fieldErrors
      });
    }
    try {
      return await executeGreenShield(parsed.data);
    } catch (err) {
      app.log.error(
        { err: err instanceof Error ? err.message : String(err) },
        "Unhandled error in /v1/execute [green-shield-provider-browser]"
      );
      return reply.code(500).send({ message: "Internal connector error" });
    }
  }

  return reply.code(400).send({
    message: `Unknown or missing connectorId: ${connectorId ?? "(none)"}`
  });
});

try {
  await app.listen({ port, host });
  app.log.info(`Connector service listening on port ${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
