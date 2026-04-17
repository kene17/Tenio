-- Rename payer_telus_health → payer_telus_eclaims to match the canonical
-- constant in @tenio/contracts (PAYER_TELUS_ECLAIMS = "payer_telus_eclaims").
-- The old name predated the contracts package and caused the Configuration
-- page connection card to never resolve for TELUS eClaims orgs.

UPDATE payer_configurations
   SET payer_id = 'payer_telus_eclaims'
 WHERE payer_id = 'payer_telus_health';

-- Also fix any claims that were submitted against the old payer ID.
UPDATE claims
   SET payer_id = 'payer_telus_eclaims'
 WHERE payer_id = 'payer_telus_health';
