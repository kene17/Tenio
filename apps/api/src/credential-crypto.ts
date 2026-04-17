import { createRequire } from "node:module";

// libsodium-wrappers ships a broken ESM build that references a missing
// libsodium.mjs file. Force-load the CJS build instead.
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sodium = require("libsodium-wrappers") as typeof import("libsodium-wrappers");

let ready = false;

async function ensureReady() {
  if (!ready) {
    await sodium.ready;
    ready = true;
  }
}

/**
 * Encrypts a UTF-8 plaintext string using libsodium secretbox
 * (XSalsa20-Poly1305). The 24-byte random nonce is prepended to the
 * ciphertext so the combined bytes can be stored as a single BYTEA column.
 */
export async function encryptCredential(
  plaintext: string,
  keyHex: string
): Promise<Buffer> {
  await ensureReady();

  const key = hexToBytes(keyHex);
  if (key.length !== sodium.crypto_secretbox_KEYBYTES) {
    throw new Error(
      `Credential encryption key must be ${sodium.crypto_secretbox_KEYBYTES * 2} hex characters`
    );
  }

  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const message = new TextEncoder().encode(plaintext);
  const ciphertext = sodium.crypto_secretbox_easy(message, nonce, key);

  const result = new Uint8Array(nonce.length + ciphertext.length);
  result.set(nonce, 0);
  result.set(ciphertext, nonce.length);
  return Buffer.from(result);
}

/**
 * Decrypts a Buffer produced by encryptCredential.
 * Throws on authentication failure (wrong key or tampered data).
 */
export async function decryptCredential(
  ciphertext: Buffer,
  keyHex: string
): Promise<string> {
  await ensureReady();

  const key = hexToBytes(keyHex);
  if (key.length !== sodium.crypto_secretbox_KEYBYTES) {
    throw new Error(
      `Credential encryption key must be ${sodium.crypto_secretbox_KEYBYTES * 2} hex characters`
    );
  }

  const nonceLen = sodium.crypto_secretbox_NONCEBYTES;
  if (ciphertext.length <= nonceLen) {
    throw new Error("Ciphertext too short");
  }

  const nonce = ciphertext.subarray(0, nonceLen);
  const encrypted = ciphertext.subarray(nonceLen);
  const plaintext = sodium.crypto_secretbox_open_easy(encrypted, nonce, key);

  if (!plaintext) {
    throw new Error("Credential decryption failed: authentication tag mismatch");
  }

  return new TextDecoder().decode(plaintext);
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Hex string must have even length");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
