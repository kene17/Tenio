import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { EvidenceArtifact } from "@tenio/contracts";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "../../..");
const evidenceRoot = path.resolve(
  process.env.TENIO_EVIDENCE_STORAGE_DIR ?? path.join(repoRoot, ".data", "evidence")
);

type StoredEvidenceArtifact = EvidenceArtifact & {
  mimeType: string;
  storageKind: "persisted";
  storageKey: string;
};

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
      storageKey: artifact.storageKey ?? artifact.url.replace(/^s3:\/\//, "")
    };
  }

  const extension = extensionForArtifact(artifact);
  const relativeStorageKey = path.join(claimId, `${artifact.id}${extension}`);
  const targetPath = path.join(evidenceRoot, relativeStorageKey);

  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, Buffer.from(artifact.inlineContentBase64, "base64"));

  return {
    id: artifact.id,
    kind: artifact.kind,
    label: artifact.label,
    url: `/api/evidence/${artifact.id}`,
    createdAt: artifact.createdAt,
    mimeType,
    storageKind: "persisted",
    storageKey: relativeStorageKey
  };
}

export async function readStoredEvidence(storageKey: string) {
  const targetPath = path.join(evidenceRoot, storageKey);
  return readFile(targetPath);
}

