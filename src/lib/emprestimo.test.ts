import { describe, expect, it, vi } from "vitest";
import {
  EmprestimoError,
  registrarEmprestimo,
  type EmprestimoRepo,
  type EquipamentoParaEmprestimo,
} from "./emprestimo";

function createMockRepo(overrides: Partial<EmprestimoRepo> = {}): EmprestimoRepo {
  const equipamentosPadrao: EquipamentoParaEmprestimo[] = [
    {
      id: "eq-1",
      nome: "Notebook 04",
      status: "DISPONIVEL",
      emprestavel: true,
    },
    {
      id: "eq-acc-1",
      nome: "Carregador Dell",
      status: "DISPONIVEL",
      emprestavel: true,
    },
  ];

  return {
    findResponsavel: vi.fn(async () => ({
      id: "resp-1",
      ativo: true,
      pendenciasReposicao: 0,
    })),
    findEquipamentosByIds: vi.fn(async (ids) =>
      equipamentosPadrao.filter((e) => ids.includes(e.id))
    ),
    createEmprestimoComItens: vi.fn(async (data) => ({
      id: "emp-1",
      responsavelId: data.responsavelId,
      retiradoEm: data.retiradoEm,
      previsaoDevolucao: data.previsaoDevolucao,
      motivo: data.motivo,
    })),
    markEquipamentosEmprestados: vi.fn(async () => {}),
    createMovimentacoesRetirada: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("registrarEmprestimo", () => {
  const now = new Date("2026-11-13T14:00:00.000Z");

  it("creates loan, items, updates equipment status to EMPRESTADO, and inserts RETIRADA movements", async () => {
    const repo = createMockRepo();

    const result = await registrarEmprestimo(
      {
        responsavelId: "resp-1",
        equipamentoIds: ["eq-1", "eq-acc-1", "eq-1"],
        motivo: "  Aula Lab 4  ",
        previsaoDevolucao: new Date("2026-11-13T18:00:00.000Z"),
      },
      { repo, now: () => now }
    );

    expect(result.emprestimo.id).toBe("emp-1");
    expect(result.itensCount).toBe(2);
    expect(repo.markEquipamentosEmprestados).toHaveBeenCalledWith([
      "eq-1",
      "eq-acc-1",
    ]);
    expect(repo.createMovimentacoesRetirada).toHaveBeenCalledWith({
      emprestimoId: "emp-1",
      responsavelId: "resp-1",
      equipamentoIds: ["eq-1", "eq-acc-1"],
      motivo: "Aula Lab 4",
      previsaoDevolucao: new Date("2026-11-13T18:00:00.000Z"),
    });
  });

  it("allows loan when Responsável has pending replacements and reports count", async () => {
    const repo = createMockRepo({
      findResponsavel: vi.fn(async () => ({
        id: "resp-1",
        ativo: true,
        pendenciasReposicao: 2,
      })),
    });

    const result = await registrarEmprestimo(
      {
        responsavelId: "resp-1",
        equipamentoIds: ["eq-1"],
        motivo: "Projeto integrador",
      },
      { repo, now: () => now }
    );

    expect(result.pendenciasReposicao).toBe(2);
  });

  it("rejects with 409 when any selected equipment is not DISPONIVEL", async () => {
    const repo = createMockRepo({
      findEquipamentosByIds: vi.fn(async () => [
        {
          id: "eq-1",
          nome: "Notebook 04",
          status: "EMPRESTADO" as const,
          emprestavel: true,
        },
      ]),
    });

    await expect(
      registrarEmprestimo(
        {
          responsavelId: "resp-1",
          equipamentoIds: ["eq-1"],
          motivo: "Aula",
        },
        { repo, now: () => now }
      )
    ).rejects.toMatchObject({
      name: "EmprestimoError",
      httpStatus: 409,
    });
  });

  it("rejects with 400 when equipment is not emprestavel or motivo is empty", async () => {
    const repo = createMockRepo({
      findEquipamentosByIds: vi.fn(async () => [
        {
          id: "eq-1",
          nome: "Servidor Rack",
          status: "DISPONIVEL" as const,
          emprestavel: false,
        },
      ]),
    });

    await expect(
      registrarEmprestimo(
        {
          responsavelId: "resp-1",
          equipamentoIds: ["eq-1"],
          motivo: "Manutenção",
        },
        { repo, now: () => now }
      )
    ).rejects.toThrow(EmprestimoError);

    await expect(
      registrarEmprestimo(
        {
          responsavelId: "resp-1",
          equipamentoIds: ["eq-1"],
          motivo: "   ",
        },
        { repo, now: () => now }
      )
    ).rejects.toMatchObject({ httpStatus: 400 });
  });
});
