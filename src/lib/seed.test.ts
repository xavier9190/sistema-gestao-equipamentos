import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CATEGORIAS,
  hashPassword,
  seedDatabase,
  type SeedDbClient,
} from "./seed";

function createMockSeedDb(): SeedDbClient {
  return {
    categoria: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    coordenacaoUser: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  };
}

describe("hashPassword", () => {
  it("hashes a password using scrypt with a random salt", () => {
    const hashA = hashPassword("senha-segura-123");
    const hashB = hashPassword("senha-segura-123");

    expect(hashA).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(hashB).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(hashA).not.toBe(hashB);
  });
});

describe("seedDatabase", () => {
  it("upserts all default categories and the single CoordenacaoUser without overwriting existing user", async () => {
    const db = createMockSeedDb();

    const result = await seedDatabase(db, {
      coordenacaoEmail: "coordenacao@ifpe.edu.br",
      coordenacaoPassword: "dev-password-123",
      nodeEnv: "development",
    });

    expect(result.categoriasCount).toBe(DEFAULT_CATEGORIAS.length);
    expect(db.categoria.upsert).toHaveBeenCalledTimes(DEFAULT_CATEGORIAS.length);

    for (const cat of DEFAULT_CATEGORIAS) {
      expect(db.categoria.upsert).toHaveBeenCalledWith({
        where: { nome: cat.nome },
        update: { descricao: cat.descricao },
        create: { nome: cat.nome, descricao: cat.descricao },
      });
    }

    expect(db.coordenacaoUser.upsert).toHaveBeenCalledTimes(1);
    const userUpsertCall = vi.mocked(db.coordenacaoUser.upsert).mock.calls[0][0];
    expect(userUpsertCall.where).toEqual({ email: "coordenacao@ifpe.edu.br" });
    expect(userUpsertCall.update).toEqual({});
    expect(userUpsertCall.create.email).toBe("coordenacao@ifpe.edu.br");
    expect(userUpsertCall.create.senhaHash).toMatch(
      /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/
    );
  });

  it("throws in production if coordenacaoPassword is missing", async () => {
    const db = createMockSeedDb();

    await expect(
      seedDatabase(db, {
        coordenacaoEmail: "coordenacao@ifpe.edu.br",
        coordenacaoPassword: "",
        nodeEnv: "production",
      })
    ).rejects.toThrow("SEED_COORDENACAO_PASSWORD");
  });
});
