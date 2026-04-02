import { createHash, createHmac } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { EvidenceArtifact } from "@tenio/contracts";

import { appConfig, getS3EvidenceStorageConfig } from "./config.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "../../..");
const defaultEvidenceRoot = path.resolve(path.join(repoRoot, ".data", "evidence"));
const evidenceRoot = path.resolve(appConfig.evidenceStorageDir ?? defaultEvidenceRoot);

type StoredEvidenceArtifact = EvidenceArtifact & {
  mimeType: string;
  storageKind: "persisted";
  storageKey: string;
  storageBackend: string;
  checksumSha256: string | null;
  sizeBytes: number;
  retentionUntil: string | null;
};

type PersistInlineArtifactInput = {
  claimId: string;
  artifact: EvidenceArtifact;
  mimeType: string;
  extension: string;
};

type PersistedStorageRecord = {
  storageKey: string;
  checksumSha256: string;
  sizeBytes: number;
  retentionUntil: string | null;
};

type EvidenceManifest = {
  storageKey: string;
  backend: string;
  mimeType: string;
  checksumSha256: string;
  sizeBytes: number;
  retentionUntil: string | null;
  writtenAt: string;
};

interface EvidenceStorageBackend {
  readonly name: string;
  persistInlineArtifact(input: PersistInlineArtifactInput): Promise<PersistedStorageRecord>;
  read(storageKey: string): Promise<Buffer>;
}

export class InvalidEvidenceStoragePathError extends Error {
  constructor(message = "Invalid evidence storage path") {
    super(message);
  }
}

function extensionForArtifact(artifact: EvidenceArtifact) {
  if (artifact.mimeType === "text/html" || artifact.kind === "raw_html") {
    return ".html";
  }

  if (artifact.mimeType === "image/svg+xml" || artifact.kind === "screenshot") {
    return ".svg";
  }

  return ".txt";
}

function normalizeMimeType(artifact: EvidenceArtifact) {
  if (artifact.mimeType) {
    return artifact.mimeType;
  }

  if (artifact.kind === "raw_html") {
    return "text/html; charset=utf-8";
  }

  if (artifact.kind === "screenshot") {
    return "image/svg+xml";
  }

  return "text/plain; charset=utf-8";
}

function buildStorageSegment(value: string, fallback: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const digest = createHash("sha256").update(value).digest("hex").slice(0, 12);

  return `${slug || fallback}-${digest}`;
}

function buildRetentionUntilIso() {
  const retentionDays = Math.max(1, appConfig.evidenceRetentionDays);
  return new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();
}

function buildManifestPath(targetPath: string) {
  return `${targetPath}.manifest.json`;
}

function hashSha256Hex(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

function hmacSha256(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function encodeS3PathSegment(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function formatAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function formatDateStamp(date: Date) {
  return formatAmzDate(date).slice(0, 8);
}

async function writeManifest(targetPath: string, manifest: EvidenceManifest) {
  const manifestPath = buildManifestPath(targetPath);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
}

class FilesystemEvidenceStorageBackend implements EvidenceStorageBackend {
  readonly name = "filesystem";

  async persistInlineArtifact({
    claimId,
    artifact,
    extension,
    mimeType
  }: PersistInlineArtifactInput): Promise<PersistedStorageRecord> {
    const relativeStorageKey = buildEvidenceStorageKey(claimId, artifact.id, extension);
    const targetPath = resolveEvidenceStoragePath(relativeStorageKey);
    const body = Buffer.from(artifact.inlineContentBase64 ?? "", "base64");
    const checksumSha256 = createHash("sha256").update(body).digest("hex");
    const retentionUntil = buildRetentionUntilIso();

    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, body);
    await writeManifest(targetPath, {
      storageKey: relativeStorageKey,
      backend: this.name,
      mimeType,
      checksumSha256,
      sizeBytes: body.byteLength,
      retentionUntil,
      writtenAt: new Date().toISOString()
    });

    return {
      storageKey: relativeStorageKey,
      checksumSha256,
      sizeBytes: body.byteLength,
      retentionUntil
    };
  }

  async read(storageKey: string) {
    const targetPath = resolveEvidenceStoragePath(storageKey);
    return readFile(targetPath);
  }
}

class S3EvidenceStorageBackend implements EvidenceStorageBackend {
  readonly name = "s3";

  constructor(
    private readonly config: NonNullable<ReturnType<typeof getS3EvidenceStorageConfig>>
  ) {}

  private buildObjectKey(storageKey: string) {
    return this.config.prefix ? `${this.config.prefix}/${storageKey}` : storageKey;
  }

  private buildRequestUrl(storageKey: string) {
    const objectKey = this.buildObjectKey(storageKey);
    const encodedObjectKey = objectKey
      .split("/")
      .map((segment) => encodeS3PathSegment(segment))
      .join("/");
    const endpoint = new URL(
      this.config.endpoint ?? `https://s3.${this.config.region}.amazonaws.com`
    );

    if (this.config.forcePathStyle) {
      endpoint.pathname = path.posix.join(endpoint.pathname, this.config.bucket, encodedObjectKey);
      return endpoint;
    }

    endpoint.hostname = `${this.config.bucket}.${endpoint.hostname}`;
    endpoint.pathname = path.posix.join(endpoint.pathname, encodedObjectKey);
    return endpoint;
  }

  private buildCanonicalUri(url: URL) {
    return url.pathname
      .split("/")
      .map((segment) => encodeS3PathSegment(decodeURIComponent(segment)))
      .join("/");
  }

  private signRequest(
    method: "GET" | "PUT",
    url: URL,
    bodyHash: string,
    extraHeaders: Record<string, string>
  ) {
    const now = new Date();
    const amzDate = formatAmzDate(now);
    const dateStamp = formatDateStamp(now);
    const credentialScope = `${dateStamp}/${this.config.region}/s3/aws4_request`;
    const headers = new Map<string, string>();

    headers.set("host", url.host);
    headers.set("x-amz-content-sha256", bodyHash);
    headers.set("x-amz-date", amzDate);

    if (this.config.sessionToken) {
      headers.set("x-amz-security-token", this.config.sessionToken);
    }

    for (const [key, value] of Object.entries(extraHeaders)) {
      headers.set(key.toLowerCase(), value.trim());
    }

    const sortedHeaderNames = [...headers.keys()].sort();
    const canonicalHeaders = sortedHeaderNames
      .map((name) => `${name}:${headers.get(name) ?? ""}\n`)
      .join("");
    const signedHeaders = sortedHeaderNames.join(";");
    const canonicalRequest = [
      method,
      this.buildCanonicalUri(url),
      "",
      canonicalHeaders,
      signedHeaders,
      bodyHash
    ].join("\n");
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      hashSha256Hex(canonicalRequest)
    ].join("\n");
    const signingKey = hmacSha256(
      hmacSha256(
        hmacSha256(hmacSha256(`AWS4${this.config.secretAccessKey}`, dateStamp), this.config.region),
        "s3"
      ),
      "aws4_request"
    );
    const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
    const authorization = [
      "AWS4-HMAC-SHA256 Credential=",
      `${this.config.accessKeyId}/${credentialScope}, `,
      `SignedHeaders=${signedHeaders}, `,
      `Signature=${signature}`
    ].join("");

    return {
      Authorization: authorization,
      ...Object.fromEntries(headers.entries())
    };
  }

  private async assertOk(response: Response, storageKey: string, operation: string) {
    if (response.ok) {
      return;
    }

    if (response.status === 404) {
      const error = new Error(`S3 evidence object not found for ${storageKey}`) as NodeJS.ErrnoException;
      error.code = "ENOENT";
      throw error;
    }

    const body = await response.text().catch(() => "");
    throw new Error(
      `S3 ${operation} failed for ${storageKey}: ${response.status}${body ? ` ${body.slice(0, 200)}` : ""}`
    );
  }

  async persistInlineArtifact({
    claimId,
    artifact,
    extension,
    mimeType
  }: PersistInlineArtifactInput): Promise<PersistedStorageRecord> {
    const relativeStorageKey = buildEvidenceStorageKey(claimId, artifact.id, extension);
    const body = Buffer.from(artifact.inlineContentBase64 ?? "", "base64");
    const checksumSha256 = hashSha256Hex(body);
    const retentionUntil = buildRetentionUntilIso();
    const url = this.buildRequestUrl(relativeStorageKey);
    const bodyHash = hashSha256Hex(body);
    const headers = this.signRequest("PUT", url, bodyHash, {
      "content-type": mimeType,
      "x-amz-meta-tenio-checksum-sha256": checksumSha256,
      "x-amz-meta-tenio-retention-until": retentionUntil
    });
    const response = await fetch(url, {
      method: "PUT",
      headers,
      body
    });

    await this.assertOk(response, relativeStorageKey, "put");

    return {
      storageKey: relativeStorageKey,
      checksumSha256,
      sizeBytes: body.byteLength,
      retentionUntil
    };
  }

  async read(storageKey: string) {
    const url = this.buildRequestUrl(storageKey);
    const headers = this.signRequest("GET", url, hashSha256Hex(""), {});
    const response = await fetch(url, {
      method: "GET",
      headers
    });

    await this.assertOk(response, storageKey, "read");
    return Buffer.from(await response.arrayBuffer());
  }
}

const storageBackend: EvidenceStorageBackend = (() => {
  if (appConfig.evidenceStorageBackend === "filesystem") {
    return new FilesystemEvidenceStorageBackend();
  }

  if (appConfig.evidenceStorageBackend === "s3") {
    const config = getS3EvidenceStorageConfig();

    if (!config) {
      throw new Error("S3 evidence storage configuration is unavailable.");
    }

    return new S3EvidenceStorageBackend(config);
  }

  throw new Error(
    `Unsupported TENIO_EVIDENCE_STORAGE_BACKEND: ${appConfig.evidenceStorageBackend}`
  );
})();

export function buildEvidenceStorageKey(claimId: string, artifactId: string, extension: string) {
  return path.join(
    buildStorageSegment(claimId, "claim"),
    `${buildStorageSegment(artifactId, "artifact")}${extension}`
  );
}

export function resolveEvidenceStoragePath(storageKey: string) {
  const targetPath = path.resolve(evidenceRoot, storageKey);
  const relativeToRoot = path.relative(evidenceRoot, targetPath);

  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    throw new InvalidEvidenceStoragePathError();
  }

  return targetPath;
}

export function getEvidenceStorageBackendName() {
  return storageBackend.name;
}

export async function persistEvidenceArtifact(
  claimId: string,
  artifact: EvidenceArtifact
): Promise<StoredEvidenceArtifact> {
  const mimeType = normalizeMimeType(artifact);

  if (!artifact.inlineContentBase64) {
    return {
      ...artifact,
      mimeType,
      storageKind: "persisted",
      storageKey: artifact.storageKey ?? artifact.url.replace(/^s3:\/\//, ""),
      storageBackend: artifact.storageBackend ?? storageBackend.name,
      checksumSha256: artifact.checksumSha256 ?? null,
      sizeBytes: artifact.sizeBytes ?? 0,
      retentionUntil: artifact.retentionUntil ?? null
    };
  }

  const extension = extensionForArtifact(artifact);
  const persisted = await storageBackend.persistInlineArtifact({
    claimId,
    artifact,
    mimeType,
    extension
  });

  return {
    id: artifact.id,
    kind: artifact.kind,
    label: artifact.label,
    url: `/api/evidence/${artifact.id}`,
    createdAt: artifact.createdAt,
    mimeType,
    storageKind: "persisted",
    storageKey: persisted.storageKey,
    storageBackend: storageBackend.name,
    checksumSha256: persisted.checksumSha256,
    sizeBytes: persisted.sizeBytes,
    retentionUntil: persisted.retentionUntil
  };
}

export async function readStoredEvidence(storageKey: string) {
  return storageBackend.read(storageKey);
}
