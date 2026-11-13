import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("hashes with a random salt and verifies matching passwords", () => {
    const hashA = hashPassword("coord-ifpe-2026");
    const hashB = hashPassword("coord-ifpe-2026");

    expect(hashA).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(hashA).not.toBe(hashB);
    expect(verifyPassword("coord-ifpe-2026", hashA)).toBe(true);
    expect(verifyPassword("senha-incorreta", hashA)).toBe(false);
  });

  it("returns false for malformed stored hashes", () => {
    expect(verifyPassword("abc", "")).toBe(false);
    expect(verifyPassword("abc", "bcrypt$123$456")).toBe(false);
    expect(verifyPassword("abc", "scrypt$invalid$short")).toBe(false);
  });
});
