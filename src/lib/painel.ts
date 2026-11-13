import type { EquipamentoStatus } from "@prisma/client";
import {
  calcularStatusEmprestimo,
  type StatusEmprestimoDerivado,
} from "./emprestimo-status";

export interface PainelItemPendente {
  id: string;
  equipamentoId: string;
  devolvidoEm: Date | null;
  equipamento: {
    id: string;
    nome: string;
    codigoPatrimonio: string | null;
    codigoInterno: string | null;
  };
}

export interface PainelEmprestimoAberto {
  id: string;
  motivo: string;
  retiradoEm: Date;
  previsaoDevolucao: Date | null;
  encerradoEm: Date | null;
  responsavel: {
    id: string;
    nome: string;
    matricula: string;
    tipo: string;
    contato: string;
  };
  itens: PainelItemPendente[];
}

export interface PainelContadores {
  totalEquipamentos: number;
  disponiveis: number;
  emprestados: number;
  emManutencao: number;
  extraviados: number;
  emprestimosEmAberto: number;
  emprestimosNoPrazo: number;
  emprestimosAtrasados: number;
  itensAtrasados: number;
}

export interface PainelPendencia {
  id: string;
  motivo: string;
  retiradoEm: string;
  previsaoDevolucao: string | null;
  status: StatusEmprestimoDerivado;
  diasAtraso: number;
  responsavel: {
    id: string;
    nome: string;
    matricula: string;
    tipo: string;
    contato: string;
  };
  itensPendentes: Array<{
    id: string;
    equipamentoId: string;
    nome: string;
    codigoPatrimonio: string | null;
    codigoInterno: string | null;
  }>;
}

export interface PainelResumo {
  atualizadoEm: string;
  contadores: PainelContadores;
  pendencias: PainelPendencia[];
}

export interface PainelRepo {
  countEquipamentosByStatus: () => Promise<
    Partial<Record<EquipamentoStatus, number>>
  >;
  findEmprestimosAbertos: () => Promise<PainelEmprestimoAberto[]>;
}

const MS_PER_DAY = 86_400_000;

function calcularDiasAtraso(
  status: StatusEmprestimoDerivado,
  previsaoDevolucao: Date | null,
  now: Date
): number {
  if (status !== "ATRASADO" || !previsaoDevolucao) {
    return 0;
  }
  const diffMs = now.getTime() - previsaoDevolucao.getTime();
  return Math.max(1, Math.floor(diffMs / MS_PER_DAY));
}

/**
 * Aggregates equipment status counters and pending/overdue loans for the coordination dashboard.
 */
export async function obterResumoPainel({
  repo,
  now = () => new Date(),
}: {
  repo: PainelRepo;
  now?: () => Date;
}): Promise<PainelResumo> {
  const currentTime = now();
  const [statusCounts, emprestimosAbertos] = await Promise.all([
    repo.countEquipamentosByStatus(),
    repo.findEmprestimosAbertos(),
  ]);

  const disponiveis = statusCounts.DISPONIVEL ?? 0;
  const emprestados = statusCounts.EMPRESTADO ?? 0;
  const emManutencao = statusCounts.EM_MANUTENCAO ?? 0;
  const extraviados = statusCounts.EXTRAVIADO ?? 0;
  const totalEquipamentos =
    disponiveis + emprestados + emManutencao + extraviados;

  const pendencias: PainelPendencia[] = emprestimosAbertos
    .map((emp) => {
      const status = calcularStatusEmprestimo(emp, currentTime);
      const itensPendentes = emp.itens
        .filter((item) => item.devolvidoEm === null)
        .map((item) => ({
          id: item.id,
          equipamentoId: item.equipamento.id,
          nome: item.equipamento.nome,
          codigoPatrimonio: item.equipamento.codigoPatrimonio,
          codigoInterno: item.equipamento.codigoInterno,
        }));

      return {
        id: emp.id,
        motivo: emp.motivo,
        retiradoEm: emp.retiradoEm.toISOString(),
        previsaoDevolucao: emp.previsaoDevolucao
          ? emp.previsaoDevolucao.toISOString()
          : null,
        status,
        diasAtraso: calcularDiasAtraso(
          status,
          emp.previsaoDevolucao,
          currentTime
        ),
        responsavel: emp.responsavel,
        itensPendentes,
      };
    })
    .filter((p) => p.itensPendentes.length > 0 && p.status !== "ENCERRADO");

  let emprestimosAtrasados = 0;
  let itensAtrasados = 0;
  for (const p of pendencias) {
    if (p.status === "ATRASADO") {
      emprestimosAtrasados += 1;
      itensAtrasados += p.itensPendentes.length;
    }
  }

  pendencias.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "ATRASADO" ? -1 : 1;
    }
    if (a.previsaoDevolucao && b.previsaoDevolucao) {
      return a.previsaoDevolucao.localeCompare(b.previsaoDevolucao);
    }
    if (a.previsaoDevolucao) return -1;
    if (b.previsaoDevolucao) return 1;
    return b.retiradoEm.localeCompare(a.retiradoEm);
  });

  const emprestimosEmAberto = pendencias.length;
  const emprestimosNoPrazo = emprestimosEmAberto - emprestimosAtrasados;

  return {
    atualizadoEm: currentTime.toISOString(),
    contadores: {
      totalEquipamentos,
      disponiveis,
      emprestados,
      emManutencao,
      extraviados,
      emprestimosEmAberto,
      emprestimosNoPrazo,
      emprestimosAtrasados,
      itensAtrasados,
    },
    pendencias,
  };
}
