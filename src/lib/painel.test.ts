import type { EquipamentoStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { registrarDevolucao } from "./devolucao";
import { registrarEmprestimo } from "./emprestimo";
import {
  obterResumoPainel,
  type PainelEmprestimoAberto,
  type PainelRepo,
} from "./painel";

function createStaticPainelRepo(
  statusCounts: Partial<Record<EquipamentoStatus, number>>,
  emprestimosAbertos: PainelEmprestimoAberto[]
): PainelRepo {
  return {
    countEquipamentosByStatus: async () => statusCounts,
    findEmprestimosAbertos: async () => emprestimosAbertos,
  };
}

describe("obterResumoPainel (clock mock)", () => {
  it("marks open loans as EM_ABERTO before previsaoDevolucao and ATRASADO after", async () => {
    const previsao = new Date("2026-11-14T18:00:00.000Z");
    const repo = createStaticPainelRepo(
      {
        DISPONIVEL: 5,
        EMPRESTADO: 2,
        EM_MANUTENCAO: 1,
        EXTRAVIADO: 0,
      },
      [
        {
          id: "emp-1",
          motivo: "Aula prática",
          retiradoEm: new Date("2026-11-13T10:00:00.000Z"),
          previsaoDevolucao: previsao,
          encerradoEm: null,
          responsavel: {
            id: "resp-1",
            nome: "Ana Silva",
            matricula: "2026001",
            tipo: "DISCENTE",
            contato: "81999990000",
          },
          itens: [
            {
              id: "item-1",
              equipamentoId: "eq-1",
              devolvidoEm: null,
              equipamento: {
                id: "eq-1",
                nome: "Notebook Dell",
                codigoPatrimonio: "PAT-001",
                codigoInterno: null,
              },
            },
            {
              id: "item-2",
              equipamentoId: "eq-2",
              devolvidoEm: new Date("2026-11-13T12:00:00.000Z"),
              equipamento: {
                id: "eq-2",
                nome: "Mouse USB",
                codigoPatrimonio: null,
                codigoInterno: "INT-0001",
              },
            },
          ],
        },
      ]
    );

    const beforeDeadline = await obterResumoPainel({
      repo,
      now: () => new Date("2026-11-14T17:59:59.000Z"),
    });

    expect(beforeDeadline.contadores).toEqual({
      totalEquipamentos: 8,
      disponiveis: 5,
      emprestados: 2,
      emManutencao: 1,
      extraviados: 0,
      emprestimosEmAberto: 1,
      emprestimosNoPrazo: 1,
      emprestimosAtrasados: 0,
      itensAtrasados: 0,
    });
    expect(beforeDeadline.pendencias).toHaveLength(1);
    expect(beforeDeadline.pendencias[0].status).toBe("EM_ABERTO");
    expect(beforeDeadline.pendencias[0].diasAtraso).toBe(0);
    // Already-returned item is excluded from itensPendentes
    expect(beforeDeadline.pendencias[0].itensPendentes).toHaveLength(1);
    expect(beforeDeadline.pendencias[0].itensPendentes[0].equipamentoId).toBe(
      "eq-1"
    );

    const afterDeadline = await obterResumoPainel({
      repo,
      now: () => new Date("2026-11-16T19:00:00.000Z"),
    });

    expect(afterDeadline.contadores.emprestimosAtrasados).toBe(1);
    expect(afterDeadline.contadores.emprestimosNoPrazo).toBe(0);
    expect(afterDeadline.contadores.itensAtrasados).toBe(1);
    expect(afterDeadline.pendencias[0].status).toBe("ATRASADO");
    expect(afterDeadline.pendencias[0].diasAtraso).toBe(2);
  });

  it("orders overdue loans before non-overdue loans", async () => {
    const repo = createStaticPainelRepo(
      { EMPRESTADO: 2 },
      [
        {
          id: "emp-on-time",
          motivo: "Seminário",
          retiradoEm: new Date("2026-11-13T10:00:00.000Z"),
          previsaoDevolucao: new Date("2026-11-15T18:00:00.000Z"),
          encerradoEm: null,
          responsavel: {
            id: "resp-1",
            nome: "Carlos",
            matricula: "1001",
            tipo: "DOCENTE",
            contato: "carlos@ifpe.edu.br",
          },
          itens: [
            {
              id: "i-1",
              equipamentoId: "eq-1",
              devolvidoEm: null,
              equipamento: {
                id: "eq-1",
                nome: "Projetor",
                codigoPatrimonio: "PAT-010",
                codigoInterno: null,
              },
            },
          ],
        },
        {
          id: "emp-late",
          motivo: "Oficina",
          retiradoEm: new Date("2026-11-10T10:00:00.000Z"),
          previsaoDevolucao: new Date("2026-11-11T18:00:00.000Z"),
          encerradoEm: null,
          responsavel: {
            id: "resp-2",
            nome: "Bianca",
            matricula: "1002",
            tipo: "TECNICO",
            contato: "bianca@ifpe.edu.br",
          },
          itens: [
            {
              id: "i-2",
              equipamentoId: "eq-2",
              devolvidoEm: null,
              equipamento: {
                id: "eq-2",
                nome: "Câmera",
                codigoPatrimonio: "PAT-020",
                codigoInterno: null,
              },
            },
          ],
        },
      ]
    );

    const resumo = await obterResumoPainel({
      repo,
      now: () => new Date("2026-11-13T12:00:00.000Z"),
    });

    expect(resumo.pendencias.map((p) => p.id)).toEqual([
      "emp-late",
      "emp-on-time",
    ]);
  });

  it("handles previsaoDevolucao: null and ignores open loans with zero pending items without negative counters", async () => {
    const repo = createStaticPainelRepo(
      { DISPONIVEL: 2, EMPRESTADO: 1 },
      [
        {
          id: "emp-empty-items",
          motivo: "Já devolvido parcialmente",
          retiradoEm: new Date("2026-11-01T10:00:00.000Z"),
          previsaoDevolucao: new Date("2026-11-02T10:00:00.000Z"),
          encerradoEm: null,
          responsavel: {
            id: "resp-1",
            nome: "Ana",
            matricula: "1001",
            tipo: "DISCENTE",
            contato: "81999990000",
          },
          itens: [],
        },
        {
          id: "emp-no-deadline",
          motivo: "Uso contínuo",
          retiradoEm: new Date("2026-11-10T10:00:00.000Z"),
          previsaoDevolucao: null,
          encerradoEm: null,
          responsavel: {
            id: "resp-2",
            nome: "Carlos",
            matricula: "1002",
            tipo: "DOCENTE",
            contato: "81988880000",
          },
          itens: [
            {
              id: "i-1",
              equipamentoId: "eq-1",
              devolvidoEm: null,
              equipamento: {
                id: "eq-1",
                nome: "Adaptador HDMI",
                codigoPatrimonio: null,
                codigoInterno: "INT-0005",
              },
            },
          ],
        },
      ]
    );

    const resumo = await obterResumoPainel({
      repo,
      now: () => new Date("2026-11-13T12:00:00.000Z"),
    });

    expect(resumo.contadores.emprestimosEmAberto).toBe(1);
    expect(resumo.contadores.emprestimosAtrasados).toBe(0);
    expect(resumo.contadores.emprestimosNoPrazo).toBe(1);
    expect(resumo.contadores.itensAtrasados).toBe(0);
    expect(resumo.pendencias).toHaveLength(1);
    expect(resumo.pendencias[0].id).toBe("emp-no-deadline");
    expect(resumo.pendencias[0].status).toBe("EM_ABERTO");
  });
});

describe("E2E domain flow: emprestimo -> painel -> atraso -> devolucao -> painel", () => {
  it("reflects a newly registered loan in the dashboard, detects overdue via clock, and clears on return", async () => {
    const equipamentos = [
      {
        id: "eq-1",
        nome: "Multímetro Digital",
        codigoPatrimonio: "PAT-100",
        codigoInterno: null,
        status: "DISPONIVEL" as EquipamentoStatus,
        emprestavel: true,
      },
      {
        id: "eq-2",
        nome: "Osciloscópio",
        codigoPatrimonio: "PAT-101",
        codigoInterno: null,
        status: "DISPONIVEL" as EquipamentoStatus,
        emprestavel: true,
      },
    ];

    const responsavel = {
      id: "resp-1",
      nome: "João Pedro",
      matricula: "2026999",
      tipo: "DISCENTE",
      contato: "81988887777",
      ativo: true,
      pendenciasReposicao: 0,
    };

    const emprestimos: PainelEmprestimoAberto[] = [];

    const painelRepo: PainelRepo = {
      countEquipamentosByStatus: async () => {
        const counts: Partial<Record<EquipamentoStatus, number>> = {};
        for (const eq of equipamentos) {
          counts[eq.status] = (counts[eq.status] ?? 0) + 1;
        }
        return counts;
      },
      findEmprestimosAbertos: async () =>
        emprestimos.filter((e) => e.encerradoEm === null),
    };

    // 1. Register loan
    const t0 = new Date("2026-11-13T10:00:00.000Z");
    const previsao = new Date("2026-11-13T18:00:00.000Z");

    const criado = await registrarEmprestimo(
      {
        responsavelId: responsavel.id,
        equipamentoIds: ["eq-1"],
        motivo: "Laboratório de Eletrônica",
        previsaoDevolucao: previsao,
      },
      {
        now: () => t0,
        repo: {
          findResponsavel: async () => responsavel,
          findEquipamentosByIds: async (ids) =>
            equipamentos.filter((e) => ids.includes(e.id)),
          createEmprestimoComItens: async (data) => {
            const empId = "emp-e2e-1";
            const itens = data.equipamentoIds.map((eqId, idx) => {
              const eq = equipamentos.find((e) => e.id === eqId)!;
              return {
                id: `item-e2e-${idx + 1}`,
                equipamentoId: eqId,
                devolvidoEm: null,
                equipamento: {
                  id: eq.id,
                  nome: eq.nome,
                  codigoPatrimonio: eq.codigoPatrimonio,
                  codigoInterno: eq.codigoInterno,
                },
              };
            });
            emprestimos.push({
              id: empId,
              motivo: data.motivo,
              retiradoEm: data.retiradoEm,
              previsaoDevolucao: data.previsaoDevolucao,
              encerradoEm: null,
              responsavel: {
                id: responsavel.id,
                nome: responsavel.nome,
                matricula: responsavel.matricula,
                tipo: responsavel.tipo,
                contato: responsavel.contato,
              },
              itens,
            });
            return {
              id: empId,
              responsavelId: data.responsavelId,
              retiradoEm: data.retiradoEm,
              previsaoDevolucao: data.previsaoDevolucao,
              motivo: data.motivo,
            };
          },
          markEquipamentosEmprestados: async (ids) => {
            for (const eq of equipamentos) {
              if (ids.includes(eq.id)) eq.status = "EMPRESTADO";
            }
          },
          createMovimentacoesRetirada: async () => {},
        },
      }
    );

    // 2. Dashboard reflects active loan before deadline
    const painelNoPrazo = await obterResumoPainel({
      repo: painelRepo,
      now: () => new Date("2026-11-13T14:00:00.000Z"),
    });
    expect(painelNoPrazo.contadores.disponiveis).toBe(1);
    expect(painelNoPrazo.contadores.emprestados).toBe(1);
    expect(painelNoPrazo.contadores.emprestimosEmAberto).toBe(1);
    expect(painelNoPrazo.contadores.emprestimosAtrasados).toBe(0);
    expect(painelNoPrazo.pendencias[0].id).toBe(criado.emprestimo.id);

    // 3. Simulated clock advances past deadline -> dashboard flags ATRASADO
    const painelAtrasado = await obterResumoPainel({
      repo: painelRepo,
      now: () => new Date("2026-11-15T19:00:00.000Z"),
    });
    expect(painelAtrasado.contadores.emprestimosAtrasados).toBe(1);
    expect(painelAtrasado.contadores.itensAtrasados).toBe(1);
    expect(painelAtrasado.pendencias[0].status).toBe("ATRASADO");
    expect(painelAtrasado.pendencias[0].diasAtraso).toBe(2);

    // 4. Register return -> dashboard clears pending list and restores DISPONIVEL
    await registrarDevolucao(
      {
        emprestimoId: criado.emprestimo.id,
        itens: [{ emprestimoItemId: "item-e2e-1", condicaoDevolucao: "BOM_ESTADO" }],
      },
      {
        now: () => new Date("2026-11-15T20:00:00.000Z"),
        repo: {
          findEmprestimoComItens: async (id) => {
            const found = emprestimos.find((e) => e.id === id);
            if (!found) return null;
            return {
              id: found.id,
              responsavelId: found.responsavel.id,
              encerradoEm: found.encerradoEm,
              itens: found.itens.map((i) => ({
                id: i.id,
                equipamentoId: i.equipamentoId,
                devolvidoEm: i.devolvidoEm,
              })),
            };
          },
          marcarItemDevolvido: async (itemId, devolvidoEm) => {
            for (const emp of emprestimos) {
              const item = emp.itens.find((i) => i.id === itemId && !i.devolvidoEm);
              if (item) {
                item.devolvidoEm = devolvidoEm;
                return true;
              }
            }
            return false;
          },
          countItensPendentes: async (empId) => {
            const emp = emprestimos.find((e) => e.id === empId);
            return emp ? emp.itens.filter((i) => i.devolvidoEm === null).length : 0;
          },
          atualizarStatusEquipamento: async (eqId, status) => {
            const eq = equipamentos.find((e) => e.id === eqId);
            if (eq) eq.status = status;
          },
          createMovimentacaoDevolucao: async () => {},
          encerrarEmprestimo: async (empId, encerradoEm) => {
            const emp = emprestimos.find((e) => e.id === empId);
            if (emp) emp.encerradoEm = encerradoEm;
          },
        },
      }
    );

    const painelFinal = await obterResumoPainel({
      repo: painelRepo,
      now: () => new Date("2026-11-15T20:05:00.000Z"),
    });
    expect(painelFinal.contadores.disponiveis).toBe(2);
    expect(painelFinal.contadores.emprestados).toBe(0);
    expect(painelFinal.contadores.emprestimosEmAberto).toBe(0);
    expect(painelFinal.contadores.emprestimosAtrasados).toBe(0);
    expect(painelFinal.pendencias).toHaveLength(0);
  });
});
