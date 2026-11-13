export const SESSION_COOKIE_NAME = "sge_session";
export const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours (balcão shift)
const DEV_FALLBACK_AUTH_SECRET = "sge-dev-only-session-secret-change-in-prod";

/** Returns consistent HttpOnly cookie attributes for session set/clear operations. */
export function buildSessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export interface SessionPayload {
  userId: string;
  email: string;
  exp: number;
}

/** Resolves the HMAC signing secret for session cookies. */
export function getSessionSecret(
  rawEnv: Record<string, string | undefined> = process.env
): string {
  const secret = rawEnv.AUTH_SECRET?.trim() ?? "";
  if (secret.length >= 32) {
    return secret;
  }

  if (rawEnv.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET must be configured with at least 32 characters in production"
    );
  }

  return secret || DEV_FALLBACK_AUTH_SECRET;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): Uint8Array | null {
  try {
    const padded = input.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (padded.length % 4)) % 4;
    const binary = atob(padded + "=".repeat(padLen));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/** Creates an HMAC-SHA256 signed session token. */
export async function createSessionToken(
  identity: { userId: string; email: string },
  options: {
    secret?: string;
    now?: Date;
    ttlSeconds?: number;
  } = {}
): Promise<string> {
  const secret = options.secret ?? getSessionSecret();
  const now = options.now ?? new Date();
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS;
  const exp = Math.floor(now.getTime() / 1000) + ttlSeconds;

  const payload: SessionPayload = {
    userId: identity.userId,
    email: identity.email,
    exp,
  };

  const encoder = new TextEncoder();
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importHmacKey(secret);
  const signatureBuffer = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body)
  );
  const signature = toBase64Url(new Uint8Array(signatureBuffer));

  return `${body}.${signature}`;
}

/** Verifies signature and expiration of a session token; returns null if invalid. */
export async function verifySessionToken(
  token: string,
  options: {
    secret?: string;
    now?: Date;
  } = {}
): Promise<SessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [body, sig] = parts;
  if (!body || !sig) {
    return null;
  }

  const sigBytes = fromBase64Url(sig);
  const bodyBytes = fromBase64Url(body);
  if (!sigBytes || !bodyBytes) {
    return null;
  }

  const secret = options.secret ?? getSessionSecret();
  const key = await importHmacKey(secret);
  const encoder = new TextEncoder();

  const validSignature = await globalThis.crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes as BufferSource,
    encoder.encode(body)
  );
  if (!validSignature) {
    return null;
  }

  try {
    const parsed = JSON.parse(new TextDecoder().decode(bodyBytes)) as Partial<SessionPayload>;
    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }

    const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1000);
    if (nowSeconds >= parsed.exp) {
      return null;
    }

    return {
      userId: parsed.userId,
      email: parsed.email,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}
