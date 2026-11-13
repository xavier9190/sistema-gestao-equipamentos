import { randomBytes, scryptSync } from "node:crypto";

export interface CategoriaSeed {
  nome: string;
  descricao: string;
}

export const DEFAULT_CATEGORIAS: readonly CategoriaSeed[] = [
  { nome: "Notebook", descricao: "Computadores portáteis" },
  { nome: "Datashow", descricao: "Projetores multimídia" },
  { nome: "Chave", descricao: "Chaves de salas e laboratórios" },
  { nome: "Tablet", descricao: "Tablets e dispositivos de leitura" },
  { nome: "Celular", descricao: "Smartphones institucionais" },
  { nome: "Acessório", descricao: "Carregadores, cabos, adaptadores e periféricos" },
] as const;

export const DEFAULT_COORDENACAO_EMAIL = "coordenacao@belojardim.ifpe.edu.br";
const DEV_FALLBACK_PASSWORD = "coordenacao-dev-password";

/** Hashes a plaintext password using scrypt with a random 16-byte salt. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derivedKey}`;
}

export interface SeedDbClient {
  categoria: {
    upsert: (args: {
      where: { nome: string };
      update: { descricao: string };
      create: { nome: string; descricao: string };
    }) => Promise<unknown>;
  };
  coordenacaoUser: {
    upsert: (args: {
      where: { email: string };
      update: Record<string, never>;
      create: { email: string; senhaHash: string };
    }) => Promise<unknown>;
  };
}

export interface SeedOptions {
  coordenacaoEmail?: string;
  coordenacaoPassword?: string;
  nodeEnv?: string;
}

export interface SeedResult {
  categoriasCount: number;
  coordenacaoEmail: string;
}

/**
 * Idempotently seeds default equipment categories and the shared Coordenação account.
 */
export async function seedDatabase(
  db: SeedDbClient,
  options: SeedOptions = {}
): Promise<SeedResult> {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV ?? "development";
  const coordenacaoEmail =
    options.coordenacaoEmail?.trim() ||
    process.env.SEED_COORDENACAO_EMAIL?.trim() ||
    DEFAULT_COORDENACAO_EMAIL;

  const rawPassword =
    options.coordenacaoPassword?.trim() ??
    process.env.SEED_COORDENACAO_PASSWORD?.trim() ??
    "";

  if (!rawPassword && nodeEnv === "production") {
    throw new Error(
      "SEED_COORDENACAO_PASSWORD is required when seeding in production"
    );
  }

  const passwordToHash = rawPassword || DEV_FALLBACK_PASSWORD;

  for (const categoria of DEFAULT_CATEGORIAS) {
    await db.categoria.upsert({
      where: { nome: categoria.nome },
      update: { descricao: categoria.descricao },
      create: { nome: categoria.nome, descricao: categoria.descricao },
    });
  }

  await db.coordenacaoUser.upsert({
    where: { email: coordenacaoEmail },
    update: {},
    create: {
      email: coordenacaoEmail,
      senhaHash: hashPassword(passwordToHash),
    },
  });

  return {
    categoriasCount: DEFAULT_CATEGORIAS.length,
    coordenacaoEmail,
  };
}
