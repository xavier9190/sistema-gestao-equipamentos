import { describe, expect, it, vi } from "vitest";
import {
  alterarStatusResponsavel,
  atualizarResponsavel,
  buildResponsavelWhere,
  criarResponsavel,
  parseResponsavelFiltros,
  ResponsavelError,
  type ResponsavelRecord,
  type ResponsavelRepo,
} from "./responsavel";

function createMockRepo(
  initial: ResponsavelRecord[] = []
): ResponsavelRepo {
  const rows = initial.map((r) => ({ ...r }));

  return {
    findById: vi.fn(async (id: string) => {
      const found = rows.find((r) => r.id === id);
      return found ? { ...found } : null;
    }),
    findByMatricula: vi.fn(async (matricula: string) => {
      const found = rows.find((r) => r.matricula === matricula);
      return found ? { ...found } : null;
    }),
    create: vi.fn(async (data) => {
      const created: ResponsavelRecord = {
        id: `resp-${rows.length + 1}`,
        matricula: data.matricula,
        nome: data.nome,
        tipo: data.tipo,
        contato: data.contato,
        ativo: true,
      };
      rows.push(created);
      return { ...created };
    }),
    update: vi.fn(async (id, data) => {
      const idx = rows.findIndex((r) => r.id === id);
      if (idx === -1) {
        throw new Error("not found");
      }
      rows[idx] = { ...rows[idx], ...data };
      return { ...rows[idx] };
    }),
  };
}

describe("parseResponsavelFiltros & buildResponsavelWhere", () => {
  it("parses q, tipo, and ativo filters safely", () => {
    const filtros = parseResponsavelFiltros({
      q: "  2024001  ",
      tipo: "DISCENTE",
      ativo: "true",
    });

    expect(filtros).toEqual({
      q: "2024001",
      tipo: "DISCENTE",
      ativo: true,
    });

    expect(buildResponsavelWhere(filtros)).toEqual({
      OR: [
        { matricula: { contains: "2024001", mode: "insensitive" } },
        { nome: { contains: "2024001", mode: "insensitive" } },
      ],
      tipo: "DISCENTE",
      ativo: true,
    });
  });

  it("ignores invalid tipo or ativo values", () => {
    expect(
      parseResponsavelFiltros({ tipo: "OUTRO", ativo: "all" })
    ).toEqual({
      q: undefined,
      tipo: undefined,
      ativo: undefined,
    });
  });
});

describe("criarResponsavel", () => {
  it("trims fields and creates an active Responsavel", async () => {
    const repo = createMockRepo();

    const created = await criarResponsavel(
      {
        matricula: " 20261001 ",
        nome: " Maria Silva ",
        tipo: "DISCENTE",
        contato: " maria@ifpe.edu.br ",
      },
      { repo }
    );

    expect(created).toEqual({
      id: "resp-1",
      matricula: "20261001",
      nome: "Maria Silva",
      tipo: "DISCENTE",
      contato: "maria@ifpe.edu.br",
      ativo: true,
    });
  });

  it("rejects duplicate matricula with 409", async () => {
    const repo = createMockRepo([
      {
        id: "resp-1",
        matricula: "20261001",
        nome: "Maria Silva",
        tipo: "DISCENTE",
        contato: "maria@ifpe.edu.br",
        ativo: true,
      },
    ]);

    await expect(
      criarResponsavel(
        {
          matricula: "20261001",
          nome: "Outro Nome",
          tipo: "DOCENTE",
          contato: "outro@ifpe.edu.br",
        },
        { repo }
      )
    ).rejects.toMatchObject({
      name: "ResponsavelError",
      httpStatus: 409,
    });
  });
});

describe("atualizarResponsavel & alterarStatusResponsavel", () => {
  it("updates fields and rejects matricula collision with another record", async () => {
    const repo = createMockRepo([
      {
        id: "resp-1",
        matricula: "1001",
        nome: "Ana",
        tipo: "DOCENTE",
        contato: "ana@ifpe.edu.br",
        ativo: true,
      },
      {
        id: "resp-2",
        matricula: "1002",
        nome: "Bruno",
        tipo: "SERVIDOR",
        contato: "bruno@ifpe.edu.br",
        ativo: true,
      },
    ]);

    const updated = await atualizarResponsavel(
      "resp-1",
      {
        matricula: "1001",
        nome: "Ana Paula",
        tipo: "DOCENTE",
        contato: "anapaula@ifpe.edu.br",
      },
      { repo }
    );
    expect(updated.nome).toBe("Ana Paula");

    await expect(
      atualizarResponsavel(
        "resp-1",
        {
          matricula: "1002",
          nome: "Ana Paula",
          tipo: "DOCENTE",
          contato: "anapaula@ifpe.edu.br",
        },
        { repo }
      )
    ).rejects.toThrow(ResponsavelError);
  });

  it("deactivates and reactivates a Responsavel", async () => {
    const repo = createMockRepo([
      {
        id: "resp-1",
        matricula: "1001",
        nome: "Ana",
        tipo: "DOCENTE",
        contato: "ana@ifpe.edu.br",
        ativo: true,
      },
    ]);

    const deactivated = await alterarStatusResponsavel("resp-1", false, {
      repo,
    });
    expect(deactivated.ativo).toBe(false);

    const reactivated = await alterarStatusResponsavel("resp-1", true, {
      repo,
    });
    expect(reactivated.ativo).toBe(true);
  });
});
