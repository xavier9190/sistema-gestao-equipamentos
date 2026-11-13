import { describe, expect, it, vi } from "vitest";
import {
  concluirOcorrencia,
  OcorrenciaError,
  registrarOcorrencia,
  transicaoStatusPorOcorrencia,
  type ConcluirOcorrenciaRepo,
  type RegistrarOcorrenciaRepo,
} from "./ocorrencia";

type MockOcorrenciaRepo = RegistrarOcorrenciaRepo & ConcluirOcorrenciaRepo;

function createMockOcorrenciaRepo(
  overrides?: Partial<MockOcorrenciaRepo>
): MockOcorrenciaRepo {
  return {
    findEquipamento: vi.fn(async () => ({
      id: "eq-1",
      status: "DISPONIVEL" as const,
      estadoConservacao: "BOM" as const,
    })),
    findActiveEmprestimoItem: vi.fn(async () => null),
    findResponsavelExists: vi.fn(async () => true),
    createOcorrencia: vi.fn(async (data) => ({
      id: "oc-1",
      ...data,
      reposicaoConcluidaEm: null,
      criadoEm: new Date("2026-11-13T15:00:00.000Z"),
    })),
    marcarEmprestimoItemEncerrado: vi.fn(async () => {}),
    countItensPendentesEmprestimo: vi.fn(async () => 0),
    encerrarEmprestimo: vi.fn(async () => {}),
    updateEquipamentoEstado: vi.fn(async () => {}),
    createMovimentacao: vi.fn(async () => {}),
    findOcorrenciaById: vi.fn(async () => null),
    marcarOcorrenciaConcluida: vi.fn(async () => true),
    ...overrides,
  };
}

describe("transicaoStatusPorOcorrencia", () => {
  it("transitions DISPONIVEL/EMPRESTADO/EM_MANUTENCAO to EXTRAVIADO on PERDA", () => {
    expect(transicaoStatusPorOcorrencia("DISPONIVEL", "PERDA", true)).toBe(
      "EXTRAVIADO"
    );
    expect(transicaoStatusPorOcorrencia("EMPRESTADO", "PERDA", true)).toBe(
      "EXTRAVIADO"
    );
    expect(transicaoStatusPorOcorrencia("EM_MANUTENCAO", "PERDA", true)).toBe(
      "EXTRAVIADO"
    );
  });

  it("transitions to EM_MANUTENCAO when impedeUso=true, and keeps DISPONIVEL when impedeUso=false", () => {
    expect(transicaoStatusPorOcorrencia("DISPONIVEL", "DANO", true)).toBe(
      "EM_MANUTENCAO"
    );
    expect(transicaoStatusPorOcorrencia("DISPONIVEL", "DEFEITO", false)).toBe(
      "DISPONIVEL"
    );
    expect(transicaoStatusPorOcorrencia("EMPRESTADO", "DEFEITO", false)).toBe(
      "DISPONIVEL"
    );
  });

  it("rejects invalid transitions from EXTRAVIADO with 409", () => {
    expect(() =>
      transicaoStatusPorOcorrencia("EXTRAVIADO", "PERDA", true)
    ).toThrow(OcorrenciaError);
    expect(() =>
      transicaoStatusPorOcorrencia("EXTRAVIADO", "DANO", true)
    ).toThrow(OcorrenciaError);
  });
});

describe("registrarOcorrencia", () => {
  const now = new Date("2026-11-13T15:00:00.000Z");

  it("records PERDA on a loaned item, links active loan responsavel, closes loan, and sets EXTRAVIADO", async () => {
    const repo = createMockOcorrenciaRepo({
      findEquipamento: vi.fn(async () => ({
        id: "eq-1",
        status: "EMPRESTADO" as const,
        estadoConservacao: "BOM" as const,
      })),
      findActiveEmprestimoItem: vi.fn(async () => ({
        id: "ei-1",
        emprestimoId: "emp-1",
        responsavelId: "resp-1",
      })),
    });

    const res = await registrarOcorrencia(
      {
        equipamentoId: "eq-1",
        tipo: "PERDA",
        descricao: "Extraviado durante evento externo.",
        deveRepor: true,
        impedeUso: true,
      },
      { repo, now: () => now }
    );

    expect(res.statusDestino).toBe("EXTRAVIADO");
    expect(res.ocorrencia.responsavelId).toBe("resp-1");
    expect(repo.marcarEmprestimoItemEncerrado).toHaveBeenCalledWith(
      "ei-1",
      now,
      "DANIFICADO"
    );
    expect(repo.encerrarEmprestimo).toHaveBeenCalledWith("emp-1", now);
    expect(repo.updateEquipamentoEstado).toHaveBeenCalledWith(
      "eq-1",
      "EXTRAVIADO",
      "DANIFICADO"
    );
    expect(repo.createMovimentacao).toHaveBeenCalledWith(
      expect.objectContaining({
        equipamentoId: "eq-1",
        responsavelId: "resp-1",
        tipoEvento: "OCORRENCIA",
        detalhes: expect.objectContaining({
          ocorrenciaId: "oc-1",
          tipo: "PERDA",
          motivo: "Extraviado durante evento externo.",
          statusAnterior: "EMPRESTADO",
          statusDestino: "EXTRAVIADO",
        }),
      })
    );
  });

  it("rejects deveRepor=true without a responsavelId and without an active loan (400)", async () => {
    const repo = createMockOcorrenciaRepo();

    await expect(
      registrarOcorrencia(
        {
          equipamentoId: "eq-1",
          tipo: "DANO",
          descricao: "Tela trincada",
          deveRepor: true,
          impedeUso: true,
        },
        { repo, now: () => now }
      )
    ).rejects.toMatchObject({ httpStatus: 400 });
  });
});

describe("concluirOcorrencia", () => {
  const now = new Date("2026-11-13T16:00:00.000Z");

  it("returns equipment to DISPONIVEL (BOM) and records Movimentacao(REPOSICAO)", async () => {
    const repo = createMockOcorrenciaRepo({
      findOcorrenciaById: vi.fn(async () => ({
        id: "oc-1",
        equipamentoId: "eq-1",
        responsavelId: "resp-1",
        tipo: "PERDA" as const,
        deveRepor: true,
        reposicaoConcluidaEm: null,
        equipamentoStatus: "EXTRAVIADO" as const,
      })),
    });

    const res = await concluirOcorrencia(
      {
        ocorrenciaId: "oc-1",
        observacao: "Notebook novo entregue pelo responsável.",
      },
      { repo, now: () => now }
    );

    expect(res.statusDestino).toBe("DISPONIVEL");
    expect(repo.marcarOcorrenciaConcluida).toHaveBeenCalledWith("oc-1", now);
    expect(repo.updateEquipamentoEstado).toHaveBeenCalledWith(
      "eq-1",
      "DISPONIVEL",
      "BOM"
    );
    expect(repo.createMovimentacao).toHaveBeenCalledWith(
      expect.objectContaining({
        equipamentoId: "eq-1",
        responsavelId: "resp-1",
        tipoEvento: "REPOSICAO",
        detalhes: expect.objectContaining({
          ocorrenciaId: "oc-1",
          tipoOcorrencia: "PERDA",
          motivo: "Notebook novo entregue pelo responsável.",
          statusAnterior: "EXTRAVIADO",
          statusDestino: "DISPONIVEL",
        }),
      })
    );
  });

  it("rejects 404 when occurrence is missing and 409 when already concluded", async () => {
    const missingRepo = createMockOcorrenciaRepo();
    await expect(
      concluirOcorrencia({ ocorrenciaId: "oc-missing" }, { repo: missingRepo })
    ).rejects.toMatchObject({ httpStatus: 404 });

    const doneRepo = createMockOcorrenciaRepo({
      findOcorrenciaById: vi.fn(async () => ({
        id: "oc-1",
        equipamentoId: "eq-1",
        responsavelId: "resp-1",
        tipo: "DANO" as const,
        deveRepor: false,
        reposicaoConcluidaEm: new Date("2026-11-12T10:00:00.000Z"),
        equipamentoStatus: "DISPONIVEL" as const,
      })),
    });
    await expect(
      concluirOcorrencia({ ocorrenciaId: "oc-1" }, { repo: doneRepo })
    ).rejects.toMatchObject({ httpStatus: 409 });
  });

  it("preserves EMPRESTADO status when concluding a non-blocking occurrence on a loaned item", async () => {
    const repo = createMockOcorrenciaRepo({
      findOcorrenciaById: vi.fn(async () => ({
        id: "oc-2",
        equipamentoId: "eq-1",
        responsavelId: "resp-1",
        tipo: "DEFEITO" as const,
        deveRepor: true,
        reposicaoConcluidaEm: null,
        equipamentoStatus: "EMPRESTADO" as const,
      })),
    });

    const res = await concluirOcorrencia(
      { ocorrenciaId: "oc-2" },
      { repo, now: () => now }
    );

    expect(res.statusDestino).toBe("EMPRESTADO");
    expect(repo.updateEquipamentoEstado).not.toHaveBeenCalled();
  });
});
