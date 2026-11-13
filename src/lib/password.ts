import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** Hashes a plaintext password using scrypt with a random 16-byte salt. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derivedKey}`;
}

/** Verifies a plaintext password against a stored scrypt hash in constant time. */
export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }

  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex || expectedHex.length % 2 !== 0) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedHex, "hex");
  const derivedBuffer = scryptSync(password, salt, 64);

  if (expectedBuffer.length !== derivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, derivedBuffer);
}
