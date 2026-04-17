/// <reference types="jest" />

import {
  canonicalPayerIdForCredentials,
  resolvePayerCredentialFromMap,
  type PayerCredentialLookup
} from "../lib/payer-credentials";

describe("canonicalPayerIdForCredentials", () => {
  it("maps legacy TELUS health id to canonical eClaims id", () => {
    expect(canonicalPayerIdForCredentials("payer_telus_health")).toBe(
      "payer_telus_eclaims"
    );
  });

  it("leaves canonical TELUS id unchanged", () => {
    expect(canonicalPayerIdForCredentials("payer_telus_eclaims")).toBe(
      "payer_telus_eclaims"
    );
  });

  it("leaves unrelated payer ids unchanged", () => {
    expect(canonicalPayerIdForCredentials("payer_sun_life")).toBe(
      "payer_sun_life"
    );
    expect(canonicalPayerIdForCredentials("payer_manulife")).toBe(
      "payer_manulife"
    );
    expect(canonicalPayerIdForCredentials("unknown_payer")).toBe("unknown_payer");
  });

  it("returns empty string as-is", () => {
    expect(canonicalPayerIdForCredentials("")).toBe("");
  });
});

describe("resolvePayerCredentialFromMap", () => {
  const disconnected: PayerCredentialLookup = {
    connected: false,
    lastVerifiedAt: null
  };

  const connected: PayerCredentialLookup = {
    connected: true,
    lastVerifiedAt: "2026-01-15T12:00:00.000Z"
  };

  it("prefers the exact payerId key when present", () => {
    const map: Record<string, PayerCredentialLookup | undefined> = {
      payer_telus_health: disconnected,
      payer_telus_eclaims: connected
    };
    expect(resolvePayerCredentialFromMap("payer_telus_health", map)).toEqual(
      disconnected
    );
  });

  it("falls back to canonical key when legacy row has no entry but canonical does", () => {
    const map: Record<string, PayerCredentialLookup | undefined> = {
      payer_telus_eclaims: connected
    };
    expect(resolvePayerCredentialFromMap("payer_telus_health", map)).toEqual(
      connected
    );
  });

  it("uses direct key when only legacy id is in map (no duplicate canonical row)", () => {
    const map: Record<string, PayerCredentialLookup | undefined> = {
      payer_telus_health: connected
    };
    expect(resolvePayerCredentialFromMap("payer_telus_health", map)).toEqual(
      connected
    );
  });

  it("returns default disconnected when map has neither key", () => {
    expect(
      resolvePayerCredentialFromMap("payer_telus_health", {})
    ).toEqual(disconnected);
    expect(
      resolvePayerCredentialFromMap("payer_telus_eclaims", {})
    ).toEqual(disconnected);
  });

  it("returns default when map keys exist but values are undefined", () => {
    const map: Record<string, PayerCredentialLookup | undefined> = {
      payer_telus_health: undefined,
      payer_telus_eclaims: undefined
    };
    expect(resolvePayerCredentialFromMap("payer_telus_health", map)).toEqual(
      disconnected
    );
  });
});
