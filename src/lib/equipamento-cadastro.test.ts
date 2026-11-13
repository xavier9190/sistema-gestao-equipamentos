import { describe, expect, it, vi } from "vitest";
import {
  cadastrarEquipamentoManual,
  EquipamentoCadastroError,
  type EquipamentoCadastroRepo,
} from "./equipamento-cadastro";

function createMockRepo(
  overrides: Partial<EquipamentoCadastroRepo> = {}
): EquipamentoCadastroRepo {
  return {
    categoriaExists: vi.fn(async () => true),
    findEquipamentoPrincipal: vi.fn(async () => ({
      id: "eq-principal",
      equipamentoPrincipalId: null,
    })),
    findExistingInternalCodes: vi.fn(async () => ["INT-0001", "INT-0002"]),
    findByCodigoPatrimonio: vi.fn(async () => null),
    createEquipamento: vi.fn(async (data) => ({
      id: "eq-novo",
      nome: data.nome,
      codigoPatrimonio: data.codigoPatrimonio,
      codigoInterno: data.codigoInterno,
      categoriaId: data.categoriaId,
      localizacao: data.localizacao,
      estadoConservacao: data.estadoConservacao,
      valorAproximado: data.valorAproximado,
      emprestavel: data.emprestavel,
      status: "DISPONIVEL" as const,
      equipamentoPrincipalId: data.equipamentoPrincipalId,
    })),
    createMovimentacaoCadastro: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("cadastrarEquipamentoManual", () => {
  it("generates INT-XXXX automatically when codigoPatrimonio is omitted and records Movimentacao(CADASTRO)", async () => {
    const repo = createMockRepo();

    const created = await cadastrarEquipamentoManual(
      {
        nome: "  Chave Lab 04 ",
        categoriaId: "cat-chave",
        localizacao: " Coordenação ",
      },
      { repo }
    );

    expect(created.codigoInterno).toBe("INT-0003");
    expect(created.codigoPatrimonio).toBeNull();
    expect(created.nome).toBe("Chave Lab 04");
    expect(created.localizacao).toBe("Coordenação");
    expect(created.status).toBe("DISPONIVEL");
    expect(repo.createMovimentacaoCadastro).toHaveBeenCalledWith({
      equipamentoId: "eq-novo",
      detalhes: {
        origem: "cadastro_manual",
        nome: "Chave Lab 04",
        codigoPatrimonio: null,
        codigoInterno: "INT-0003",
        categoriaId: "cat-chave",
        localizacao: "Coordenação",
        equipamentoPrincipalId: null,
      },
    });
  });

  it("links accessory to a valid principal equipment", async () => {
    const repo = createMockRepo();

    const created = await cadastrarEquipamentoManual(
      {
        nome: "Carregador Dell 65W",
        categoriaId: "cat-acessorio",
        localizacao: "Coordenação",
        equipamentoPrincipalId: "eq-principal",
      },
      { repo }
    );

    expect(created.equipamentoPrincipalId).toBe("eq-principal");
    expect(repo.findEquipamentoPrincipal).toHaveBeenCalledWith("eq-principal");
  });

  it("rejects linking an accessory to another accessory", async () => {
    const repo = createMockRepo({
      findEquipamentoPrincipal: vi.fn(async () => ({
        id: "eq-sub",
        equipamentoPrincipalId: "eq-root",
      })),
    });

    await expect(
      cadastrarEquipamentoManual(
        {
          nome: "Adaptador",
          categoriaId: "cat-acessorio",
          localizacao: "Coordenação",
          equipamentoPrincipalId: "eq-sub",
        },
        { repo }
      )
    ).rejects.toThrow(EquipamentoCadastroError);
  });

  it("rejects duplicate codigoPatrimonio", async () => {
    const repo = createMockRepo({
      findByCodigoPatrimonio: vi.fn(async () => ({ id: "eq-existing" })),
    });

    await expect(
      cadastrarEquipamentoManual(
        {
          nome: "Notebook 01",
          codigoPatrimonio: "PAT 000123",
          categoriaId: "cat-note",
          localizacao: "Sala 1",
        },
        { repo }
      )
    ).rejects.toThrow("Já existe um equipamento com este código de patrimônio.");
  });
});
