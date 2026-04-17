/**
 * Maps legacy `payer_configurations.payer_id` values to canonical IDs used by
 * @tenio/contracts and the credentials API (`/payers/:payerId/credentials`).
 */
const LEGACY_PAYER_ID_TO_CREDENTIALS_KEY: Record<string, string> = {
  payer_telus_health: "payer_telus_eclaims"
};

export function canonicalPayerIdForCredentials(payerId: string): string {
  return LEGACY_PAYER_ID_TO_CREDENTIALS_KEY[payerId] ?? payerId;
}

export type PayerCredentialLookup = {
  connected: boolean;
  lastVerifiedAt: string | null;
};

/**
 * Resolves credential status for a configuration row: prefer the row's
 * `payerId`, then the canonical credentials key (e.g. legacy TELUS → eClaims).
 */
export function resolvePayerCredentialFromMap(
  payerId: string,
  map: Record<string, PayerCredentialLookup | undefined>
): PayerCredentialLookup {
  return (
    map[payerId] ??
    map[canonicalPayerIdForCredentials(payerId)] ?? {
      connected: false,
      lastVerifiedAt: null
    }
  );
}
