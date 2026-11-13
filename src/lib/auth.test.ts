import { describe, expect, it, vi } from "vitest";
import {
  authenticateCoordenacao,
  LOCKOUT_DURATION_MS,
  MAX_FAILED_ATTEMPTS,
  type AuthUserRecord,
  type CoordenacaoAuthRepo,
} from "./auth";
import { hashPassword } from "./password";
import type { StructuredLogger } from "./logger";

function createMockLogger(): StructuredLogger {
  return {
    info: vi.fn(),
    error: vi.fn(),
  };
}

function createInMemoryRepo(initialUser?: AuthUserRecord): {
  repo: CoordenacaoAuthRepo;
  getState: () => AuthUserRecord | undefined;
} {
  let user = initialUser ? { ...initialUser } : undefined;

  const repo: CoordenacaoAuthRepo = {
    findByEmail: vi.fn(async (email: string) => {
      if (user && user.email === email) {
        return { ...user };
      }
      return null;
    }),
    updateLoginState: vi.fn(async (id, data) => {
      if (user && user.id === id) {
        user = {
          ...user,
          tentativasFalhas: data.tentativasFalhas,
          bloqueadoAte: data.bloqueadoAte,
        };
      }
    }),
  };

  return { repo, getState: () => user };
}

describe("authenticateCoordenacao", () => {
  const email = "coordenacao@belojardim.ifpe.edu.br";
  const password = "senha-correta-2026";
  const now = new Date("2026-11-13T12:00:00.000Z");

  it("returns generic 401 when email is not found", async () => {
    const { repo } = createInMemoryRepo(undefined);
    const logger = createMockLogger();

    const result = await authenticateCoordenacao(
      { email, password },
      { repo, logger, now: () => now }
    );

    expect(result).toEqual({
      ok: false,
      httpStatus: 401,
      message: "E-mail ou senha inválidos.",
    });
  });

  it("authenticates valid credentials and resets prior failed attempts", async () => {
    const { repo, getState } = createInMemoryRepo({
      id: "coord-1",
      email,
      senhaHash: hashPassword(password),
      tentativasFalhas: 3,
      bloqueadoAte: null,
    });
    const logger = createMockLogger();

    const result = await authenticateCoordenacao(
      { email: "  COORDENACAO@belojardim.ifpe.edu.br ", password },
      { repo, logger, now: () => now }
    );

    expect(result).toEqual({
      ok: true,
      httpStatus: 200,
      user: { id: "coord-1", email },
    });
    expect(getState()?.tentativasFalhas).toBe(0);
    expect(getState()?.bloqueadoAte).toBeNull();
  });

  it("increments failed attempts and locks the account on the 5th failure", async () => {
    const { repo, getState } = createInMemoryRepo({
      id: "coord-1",
      email,
      senhaHash: hashPassword(password),
      tentativasFalhas: 0,
      bloqueadoAte: null,
    });
    const logger = createMockLogger();

    for (let attempt = 1; attempt < MAX_FAILED_ATTEMPTS; attempt += 1) {
      const res = await authenticateCoordenacao(
        { email, password: "wrong" },
        { repo, logger, now: () => now }
      );
      expect(res.ok).toBe(false);
      expect(res.httpStatus).toBe(401);
      expect(getState()?.tentativasFalhas).toBe(attempt);
      expect(getState()?.bloqueadoAte).toBeNull();
    }

    const fifth = await authenticateCoordenacao(
      { email, password: "wrong" },
      { repo, logger, now: () => now }
    );

    expect(fifth.ok).toBe(false);
    expect(fifth.httpStatus).toBe(429);
    expect(getState()?.tentativasFalhas).toBe(MAX_FAILED_ATTEMPTS);
    expect(getState()?.bloqueadoAte?.getTime()).toBe(
      now.getTime() + LOCKOUT_DURATION_MS
    );
  });

  it("blocks login even with the right password while lockout is active", async () => {
    const bloqueadoAte = new Date(now.getTime() + 60_000);
    const { repo, getState } = createInMemoryRepo({
      id: "coord-1",
      email,
      senhaHash: hashPassword(password),
      tentativasFalhas: MAX_FAILED_ATTEMPTS,
      bloqueadoAte,
    });
    const logger = createMockLogger();

    const result = await authenticateCoordenacao(
      { email, password },
      { repo, logger, now: () => now }
    );

    expect(result.ok).toBe(false);
    expect(result.httpStatus).toBe(429);
    expect(getState()?.tentativasFalhas).toBe(MAX_FAILED_ATTEMPTS);
    expect(getState()?.bloqueadoAte).toEqual(bloqueadoAte);
  });

  it("resets lockout counter after lockout window expires", async () => {
    const expiredLockout = new Date(now.getTime() - 1_000);
    const { repo, getState } = createInMemoryRepo({
      id: "coord-1",
      email,
      senhaHash: hashPassword(password),
      tentativasFalhas: MAX_FAILED_ATTEMPTS,
      bloqueadoAte: expiredLockout,
    });
    const logger = createMockLogger();

    const failedAfterExpiry = await authenticateCoordenacao(
      { email, password: "wrong" },
      { repo, logger, now: () => now }
    );

    expect(failedAfterExpiry.ok).toBe(false);
    expect(failedAfterExpiry.httpStatus).toBe(401);
    expect(getState()?.tentativasFalhas).toBe(1);
    expect(getState()?.bloqueadoAte).toBeNull();
  });
});
