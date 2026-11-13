import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  getSessionSecret,
  verifySessionToken,
} from "./session";

describe("session token", () => {
  const secret = "test-secret-with-at-least-32-characters-long";

  it("creates and verifies a valid session token", async () => {
    const now = new Date("2026-11-13T10:00:00.000Z");
    const token = await createSessionToken(
      { userId: "user-1", email: "coordenacao@ifpe.edu.br" },
      { secret, now, ttlSeconds: 3600 }
    );

    const payload = await verifySessionToken(token, {
      secret,
      now: new Date("2026-11-13T10:30:00.000Z"),
    });

    expect(payload).toEqual({
      userId: "user-1",
      email: "coordenacao@ifpe.edu.br",
      exp: Math.floor(now.getTime() / 1000) + 3600,
    });
  });

  it("rejects expired, tampered, or malformed tokens", async () => {
    const now = new Date("2026-11-13T10:00:00.000Z");
    const token = await createSessionToken(
      { userId: "user-1", email: "coordenacao@ifpe.edu.br" },
      { secret, now, ttlSeconds: 60 }
    );

    // Expired
    expect(
      await verifySessionToken(token, {
        secret,
        now: new Date("2026-11-13T10:02:00.000Z"),
      })
    ).toBeNull();

    // Tampered
    const [body, sig] = token.split(".");
    const tampered = `${body}x.${sig}`;
    expect(await verifySessionToken(tampered, { secret, now })).toBeNull();

    // Wrong secret
    expect(
      await verifySessionToken(token, {
        secret: "different-secret-with-at-least-32-characters",
        now,
      })
    ).toBeNull();

    // Malformed
    expect(await verifySessionToken("not-a-token", { secret, now })).toBeNull();
  });

  it("requires AUTH_SECRET in production", () => {
    expect(() =>
      getSessionSecret({ NODE_ENV: "production", AUTH_SECRET: "" })
    ).toThrow("AUTH_SECRET");

    expect(
      getSessionSecret({ NODE_ENV: "development" }).length
    ).toBeGreaterThanOrEqual(32);
  });
});
