import type { StructuredLogger } from "./logger";
import { verifyPassword } from "./password";

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

const GENERIC_AUTH_ERROR = "E-mail ou senha inválidos.";
const LOCKOUT_ERROR =
  "Muitas tentativas falhas. Acesso bloqueado temporariamente.";

export interface AuthUserRecord {
  id: string;
  email: string;
  senhaHash: string;
  tentativasFalhas: number;
  bloqueadoAte: Date | null;
}

export interface CoordenacaoAuthRepo {
  findByEmail: (email: string) => Promise<AuthUserRecord | null>;
  updateLoginState: (
    id: string,
    data: { tentativasFalhas: number; bloqueadoAte: Date | null }
  ) => Promise<void>;
}

export interface AuthenticateDeps {
  repo: CoordenacaoAuthRepo;
  logger: StructuredLogger;
  now?: () => Date;
}

export type AuthenticateResult =
  | {
      ok: true;
      httpStatus: 200;
      user: { id: string; email: string };
    }
  | {
      ok: false;
      httpStatus: 401 | 429;
      message: string;
      bloqueadoAte?: Date;
    };

/**
 * Authenticates the shared Coordenação account with generic error messages
 * and temporary lockout after 5 consecutive failed attempts (PBI-01 / SPEC.md).
 */
export async function authenticateCoordenacao(
  input: { email: string; password: string },
  { repo, logger, now = () => new Date() }: AuthenticateDeps
): Promise<AuthenticateResult> {
  const email = input.email.trim().toLowerCase();
  const currentTime = now();

  const user = await repo.findByEmail(email);
  if (!user) {
    logger.info("auth.login.failed", { reason: "unknown_email" });
    return { ok: false, httpStatus: 401, message: GENERIC_AUTH_ERROR };
  }

  if (
    user.bloqueadoAte !== null &&
    currentTime.getTime() < user.bloqueadoAte.getTime()
  ) {
    logger.info("auth.login.blocked", {
      userId: user.id,
      bloqueadoAte: user.bloqueadoAte.toISOString(),
    });
    return {
      ok: false,
      httpStatus: 429,
      message: LOCKOUT_ERROR,
      bloqueadoAte: user.bloqueadoAte,
    };
  }

  const passwordMatches = verifyPassword(input.password, user.senhaHash);

  if (!passwordMatches) {
    const lockoutExpired =
      user.bloqueadoAte !== null &&
      currentTime.getTime() >= user.bloqueadoAte.getTime();
    const baseAttempts = lockoutExpired ? 0 : user.tentativasFalhas;
    const nextAttempts = baseAttempts + 1;
    const shouldLock = nextAttempts >= MAX_FAILED_ATTEMPTS;
    const nextLockout = shouldLock
      ? new Date(currentTime.getTime() + LOCKOUT_DURATION_MS)
      : null;

    await repo.updateLoginState(user.id, {
      tentativasFalhas: nextAttempts,
      bloqueadoAte: nextLockout,
    });

    logger.info("auth.login.failed", {
      userId: user.id,
      tentativasFalhas: nextAttempts,
      locked: shouldLock,
    });

    if (shouldLock && nextLockout) {
      return {
        ok: false,
        httpStatus: 429,
        message: LOCKOUT_ERROR,
        bloqueadoAte: nextLockout,
      };
    }

    return { ok: false, httpStatus: 401, message: GENERIC_AUTH_ERROR };
  }

  if (user.tentativasFalhas !== 0 || user.bloqueadoAte !== null) {
    await repo.updateLoginState(user.id, {
      tentativasFalhas: 0,
      bloqueadoAte: null,
    });
  }

  logger.info("auth.login.succeeded", { userId: user.id });

  return {
    ok: true,
    httpStatus: 200,
    user: { id: user.id, email: user.email },
  };
}
