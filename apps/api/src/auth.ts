import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import {
  hasPermission,
  normalizeUserRole,
  roleLabel as formatRoleLabel,
  type UserRole
} from "@tenio/domain";

export type UserSession = {
  id: string;
  userId: string;
  organizationId: string;
  organizationName?: string;
  role: UserRole;
  fullName: string;
  email: string;
  expiresAt: string;
};

const KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");

  if (!salt || !hash) {
    return false;
  }

  const derived = scryptSync(password, salt, KEY_LENGTH);
  const stored = Buffer.from(hash, "hex");

  if (stored.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(derived, stored);
}

export function normalizeRole(value: string | null | undefined) {
  return normalizeUserRole(value);
}

export function roleLabel(role: UserRole) {
  return formatRoleLabel(role);
}

export function canManagePayerConfiguration(role: UserRole) {
  return hasPermission(role, "payer:read");
}

export function canExportResults(role: UserRole) {
  return hasPermission(role, "claims:export");
}

export function canImportClaims(role: UserRole) {
  return hasPermission(role, "claims:import");
}

export function canMutateClaims(role: UserRole) {
  return hasPermission(role, "claims:write");
}
