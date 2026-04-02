import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  buildEvidenceStorageKey,
  getEvidenceStorageBackendName,
  InvalidEvidenceStoragePathError,
  persistEvidenceArtifact,
  readStoredEvidence,
  resolveEvidenceStoragePath
} from "./evidence-storage.js";

test("buildEvidenceStorageKey removes traversal from persisted paths", () => {
  const storageKey = buildEvidenceStorageKey(
    "CLM-../../../../tmp/pwn",
    "artifact_CLM-../../../../tmp/pwn_status",
    ".svg"
  );

  assert.equal(path.isAbsolute(storageKey), false);
  assert.equal(storageKey.includes(".."), false);
  assert.match(storageKey, /\.svg$/);
});

test("resolveEvidenceStoragePath rejects paths outside evidence root", () => {
  assert.throws(
    () => resolveEvidenceStoragePath("../outside.txt"),
    InvalidEvidenceStoragePathError
  );
});

test("persistEvidenceArtifact writes manifest-backed filesystem evidence", async () => {
  const stored = await persistEvidenceArtifact("CLM-TEST-EVIDENCE", {
    id: "artifact_test_manifest",
    kind: "note",
    label: "Manifest test",
    url: "capture://artifact_test_manifest.txt",
    createdAt: new Date().toISOString(),
    storageKind: "inline",
    storageKey: null,
    inlineContentBase64: Buffer.from("manifest-backed evidence").toString("base64")
  });

  assert.equal(stored.storageBackend, getEvidenceStorageBackendName());
  assert.equal(stored.storageKind, "persisted");
  assert.ok(stored.storageKey);
  assert.ok(stored.checksumSha256);
  assert.ok(stored.sizeBytes > 0);
  assert.ok(stored.retentionUntil);

  const body = await readStoredEvidence(stored.storageKey);
  assert.equal(body.toString("utf8"), "manifest-backed evidence");

  const manifestPath = `${resolveEvidenceStoragePath(stored.storageKey)}.manifest.json`;
  await access(manifestPath);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    backend: string;
    storageKey: string;
  };

  assert.equal(manifest.backend, getEvidenceStorageBackendName());
  assert.equal(manifest.storageKey, stored.storageKey);
});
