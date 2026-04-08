import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export type AppRole = "admin" | "manager" | "operator" | "viewer";

export type UserSession = {
  id: string;
  userId: string;
  organizationId: string;
  role: AppRole;
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

export function roleLabel(role: AppRole) {
  if (role === "admin") return "Admin";
  if (role === "manager") return "Manager";
  if (role === "operator") return "Operator";
  return "Viewer";
}

export function canManagePayerConfiguration(role: AppRole) {
  return role === "admin" || role === "manager";
}

export function canExportResults(role: AppRole) {
  return role === "admin" || role === "manager";
}

export function canImportClaims(role: AppRole) {
  return role === "admin" || role === "manager" || role === "operator";
}

export function canMutateClaims(role: AppRole) {
  return role === "admin" || role === "manager" || role === "operator";
}
