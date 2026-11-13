import { describe, expect, it, vi } from "vitest";
import {
  DevolucaoError,
  registrarDevolucao,
  statusDestinoPorCondicao,
  type DevolucaoRepo,
  type EmprestimoParaDevolucao,
} from "./devolucao";

function createMockRepo(
  emprestimo: EmprestimoParaDevolucao | null
): DevolucaoRepo {
  const state = emprestimo
    ? {
        ...emprestimo,
        itens: emprestimo.itens.map((item) => ({ ...item })),
      }
    : null;

  return {
    findEmprestimoComItens: vi.fn(async () => state),
    marcarItemDevolvido: vi.fn(async (emprestimoItemId, devolvidoEm) => {
      if (!state) return false;
      const item = state.itens.find(
        (i) => i.id === emprestimoItemId && i.devolvidoEm === null
      );
      if (!item) return false;
      item.devolvidoEm = devolvidoEm;
      return true;
    }),
    countItensPendentes: vi.fn(async () => {
      if (!state) return 0;
      return state.itens.filter((i) => i.devolvidoEm === null).length;
    }),
    atualizarStatusEquipamento: vi.fn(async () => {}),
    createMovimentacaoDevolucao: vi.fn(async () => {}),
    encerrarEmprestimo: vi.fn(async () => {}),
  };
}

describe("statusDestinoPorCondicao", () => {
  it("maps BOM_ESTADO to DISPONIVEL and defect/damage to EM_MANUTENCAO", () => {
    expect(statusDestinoPorCondicao("BOM_ESTADO")).toBe("DISPONIVEL");
    expect(statusDestinoPorCondicao("COM_DEFEITO")).toBe("EM_MANUTENCAO");
    expect(statusDestinoPorCondicao("DANIFICADO")).toBe("EM_MANUTENCAO");
  });
});

describe("registrarDevolucao", () => {
  const now = new Date("2026-11-13T16:00:00.000Z");

  it("closes the loan when all pending items are returned in good condition", async () => {
    const repo = createMockRepo({
      id: "emp-1",
      responsavelId: "resp-1",
      encerradoEm: null,
      itens: [
        {
          id: "item-1",
          equipamentoId: "eq-1",
          devolvidoEm: null,
        },
        {
          id: "item-2",
          equipamentoId: "eq-2",
          devolvidoEm: null,
        },
      ],
    });

    const result = await registrarDevolucao(
      {
        emprestimoId: "emp-1",
        itens: [
          { emprestimoItemId: "item-1", condicaoDevolucao: "BOM_ESTADO" },
          { emprestimoItemId: "item-2", condicaoDevolucao: "BOM_ESTADO" },
        ],
      },
      { repo, now: () => now }
    );

    expect(result).toEqual({
      emprestimoId: "emp-1",
      encerrado: true,
      parcial: false,
      itensDevolvidosCount: 2,
      itensRestantesCount: 0,
      itensComProblema: [],
    });
    expect(repo.atualizarStatusEquipamento).toHaveBeenCalledWith(
      "eq-1",
      "DISPONIVEL",
      "BOM"
    );
    expect(repo.encerrarEmprestimo).toHaveBeenCalledWith("emp-1", now);
    expect(repo.createMovimentacaoDevolucao).toHaveBeenCalledTimes(2);
  });

  it("supports partial return without closing the loan and routes damaged items to EM_MANUTENCAO", async () => {
    const repo = createMockRepo({
      id: "emp-1",
      responsavelId: "resp-1",
      encerradoEm: null,
      itens: [
        { id: "item-1", equipamentoId: "eq-1", devolvidoEm: null },
        { id: "item-2", equipamentoId: "eq-2", devolvidoEm: null },
      ],
    });

    const result = await registrarDevolucao(
      {
        emprestimoId: "emp-1",
        itens: [
          { emprestimoItemId: "item-1", condicaoDevolucao: "DANIFICADO" },
        ],
      },
      { repo, now: () => now }
    );

    expect(result).toEqual({
      emprestimoId: "emp-1",
      encerrado: false,
      parcial: true,
      itensDevolvidosCount: 1,
      itensRestantesCount: 1,
      itensComProblema: [
        {
          equipamentoId: "eq-1",
          condicaoDevolucao: "DANIFICADO",
        },
      ],
    });
    expect(repo.atualizarStatusEquipamento).toHaveBeenCalledWith(
      "eq-1",
      "EM_MANUTENCAO",
      "DANIFICADO"
    );
    expect(repo.encerrarEmprestimo).not.toHaveBeenCalled();
  });

  it("rejects with 409 if an item was already returned", async () => {
    const repo = createMockRepo({
      id: "emp-1",
      responsavelId: "resp-1",
      encerradoEm: null,
      itens: [
        {
          id: "item-1",
          equipamentoId: "eq-1",
          devolvidoEm: new Date("2026-11-13T15:00:00.000Z"),
        },
      ],
    });

    await expect(
      registrarDevolucao(
        {
          emprestimoId: "emp-1",
          itens: [
            { emprestimoItemId: "item-1", condicaoDevolucao: "BOM_ESTADO" },
          ],
        },
        { repo, now: () => now }
      )
    ).rejects.toThrow(DevolucaoError);
  });

  it("closes the loan on final partial return and routes COM_DEFEITO to EM_MANUTENCAO", async () => {
    const repo = createMockRepo({
      id: "emp-1",
      responsavelId: "resp-1",
      encerradoEm: null,
      itens: [
        {
          id: "item-1",
          equipamentoId: "eq-1",
          devolvidoEm: new Date("2026-11-12T10:00:00.000Z"),
        },
        { id: "item-2", equipamentoId: "eq-2", devolvidoEm: null },
      ],
    });

    const result = await registrarDevolucao(
      {
        emprestimoId: "emp-1",
        itens: [
          { emprestimoItemId: "item-2", condicaoDevolucao: "COM_DEFEITO" },
        ],
      },
      { repo, now: () => now }
    );

    expect(result).toEqual({
      emprestimoId: "emp-1",
      encerrado: true,
      parcial: false,
      itensDevolvidosCount: 1,
      itensRestantesCount: 0,
      itensComProblema: [
        {
          equipamentoId: "eq-2",
          condicaoDevolucao: "COM_DEFEITO",
        },
      ],
    });
    expect(repo.atualizarStatusEquipamento).toHaveBeenCalledWith(
      "eq-2",
      "EM_MANUTENCAO",
      "COM_DEFEITO"
    );
    expect(repo.encerrarEmprestimo).toHaveBeenCalledWith("emp-1", now);
  });

  it("rejects empty items (400), duplicate items (400), missing loan (404), closed loan (409), and concurrent double-return (409)", async () => {
    const emptyRepo = createMockRepo(null);
    await expect(
      registrarDevolucao({ emprestimoId: "emp-1", itens: [] }, { repo: emptyRepo })
    ).rejects.toMatchObject({ httpStatus: 400 });

    await expect(
      registrarDevolucao(
        {
          emprestimoId: "emp-1",
          itens: [
            { emprestimoItemId: "item-1", condicaoDevolucao: "BOM_ESTADO" },
            { emprestimoItemId: "item-1", condicaoDevolucao: "DANIFICADO" },
          ],
        },
        { repo: emptyRepo }
      )
    ).rejects.toMatchObject({ httpStatus: 400 });

    await expect(
      registrarDevolucao(
        {
          emprestimoId: "emp-missing",
          itens: [
            { emprestimoItemId: "item-1", condicaoDevolucao: "BOM_ESTADO" },
          ],
        },
        { repo: emptyRepo }
      )
    ).rejects.toMatchObject({ httpStatus: 404 });

    const closedRepo = createMockRepo({
      id: "emp-closed",
      responsavelId: "resp-1",
      encerradoEm: new Date("2026-11-12T10:00:00.000Z"),
      itens: [{ id: "item-1", equipamentoId: "eq-1", devolvidoEm: null }],
    });
    await expect(
      registrarDevolucao(
        {
          emprestimoId: "emp-closed",
          itens: [
            { emprestimoItemId: "item-1", condicaoDevolucao: "BOM_ESTADO" },
          ],
        },
        { repo: closedRepo }
      )
    ).rejects.toMatchObject({ httpStatus: 409 });

    const raceRepo = createMockRepo({
      id: "emp-race",
      responsavelId: "resp-1",
      encerradoEm: null,
      itens: [{ id: "item-1", equipamentoId: "eq-1", devolvidoEm: null }],
    });
    raceRepo.marcarItemDevolvido = vi.fn(async () => false);
    await expect(
      registrarDevolucao(
        {
          emprestimoId: "emp-race",
          itens: [
            { emprestimoItemId: "item-1", condicaoDevolucao: "BOM_ESTADO" },
          ],
        },
        { repo: raceRepo }
      )
    ).rejects.toMatchObject({ httpStatus: 409 });
  });
});
