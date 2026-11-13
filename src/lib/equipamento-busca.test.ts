import { describe, expect, it, vi } from "vitest";
import {
  buscarEquipamentoPorCodigo,
  EquipamentoBuscaError,
  normalizarCodigoLido,
  type EquipamentoBuscaRecord,
  type EquipamentoBuscaRepo,
} from "./equipamento-busca";

function createSampleRecord(
  overrides: Partial<EquipamentoBuscaRecord> = {}
): EquipamentoBuscaRecord {
  return {
    id: "eq-1",
    nome: "Notebook Dell 04",
    codigoPatrimonio: "PAT 000004",
    codigoInterno: null,
    categoria: "Notebook",
    localizacao: "Coordenação",
    status: "DISPONIVEL",
    emprestavel: true,
    acessoriosDisponiveis: [
      {
        id: "eq-acc-1",
        nome: "Carregador Dell 65W",
        codigoInterno: "INT-0001",
        codigoPatrimonio: null,
      },
    ],
    emprestimoAtivo: null,
    ...overrides,
  };
}

describe("normalizarCodigoLido", () => {
  it("trims whitespace and collapses repeated spaces", () => {
    expect(normalizarCodigoLido("  INT-0012 \r\n ")).toBe("INT-0012");
    expect(normalizarCodigoLido("  PAT   000004  ")).toBe("PAT 000004");
  });
});

describe("buscarEquipamentoPorCodigo", () => {
  it("throws 400 when code is empty", async () => {
    const repo: EquipamentoBuscaRepo = {
      findByCodigo: vi.fn(),
    };

    await expect(
      buscarEquipamentoPorCodigo("   ", { repo })
    ).rejects.toMatchObject({
      name: "EquipamentoBuscaError",
      httpStatus: 400,
    });
    expect(repo.findByCodigo).not.toHaveBeenCalled();
  });

  it("throws 404 when no equipment matches the code", async () => {
    const repo: EquipamentoBuscaRepo = {
      findByCodigo: vi.fn(async () => null),
    };

    await expect(
      buscarEquipamentoPorCodigo("INT-9999", { repo })
    ).rejects.toThrow(EquipamentoBuscaError);
  });

  it("normalizes code and returns equipment record from repo", async () => {
    const record = createSampleRecord();
    const repo: EquipamentoBuscaRepo = {
      findByCodigo: vi.fn(async () => record),
    };

    const result = await buscarEquipamentoPorCodigo("  PAT   000004\n", {
      repo,
    });

    expect(repo.findByCodigo).toHaveBeenCalledWith("PAT 000004");
    expect(result).toEqual(record);
  });
});
