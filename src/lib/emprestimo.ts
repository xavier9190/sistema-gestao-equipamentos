import type { EquipamentoStatus } from "@prisma/client";

export class EmprestimoError extends Error {
  readonly httpStatus: 400 | 404 | 409;

  constructor(message: string, httpStatus: 400 | 404 | 409 = 400) {
    super(message);
    this.name = "EmprestimoError";
    this.httpStatus = httpStatus;
  }
}

export interface EquipamentoParaEmprestimo {
  id: string;
  nome: string;
  status: EquipamentoStatus;
  emprestavel: boolean;
}

export interface EmprestimoCriado {
  id: string;
  responsavelId: string;
  retiradoEm: Date;
  previsaoDevolucao: Date | null;
  motivo: string;
}

export interface EmprestimoRepo {
  findResponsavel: (id: string) => Promise<{
    id: string;
    ativo: boolean;
    pendenciasReposicao: number;
  } | null>;
  findEquipamentosByIds: (
    ids: string[]
  ) => Promise<EquipamentoParaEmprestimo[]>;
  createEmprestimoComItens: (data: {
    responsavelId: string;
    retiradoEm: Date;
    previsaoDevolucao: Date | null;
    motivo: string;
    equipamentoIds: string[];
  }) => Promise<EmprestimoCriado>;
  markEquipamentosEmprestados: (equipamentoIds: string[]) => Promise<void>;
  createMovimentacoesRetirada: (data: {
    emprestimoId: string;
    responsavelId: string;
    equipamentoIds: string[];
    motivo: string;
    previsaoDevolucao: Date | null;
  }) => Promise<void>;
}

export interface RegistrarEmprestimoInput {
  responsavelId: string;
  equipamentoIds: string[];
  motivo: string;
  previsaoDevolucao?: Date | null;
}

/**
 * Registers a loan atomically: validates Responsável and equipment availability,
 * creates Emprestimo + EmprestimoItem rows, updates status to EMPRESTADO,
 * and appends immutable Movimentacao(RETIRADA) events.
 */
export async function registrarEmprestimo(
  input: RegistrarEmprestimoInput,
  { repo, now = () => new Date() }: { repo: EmprestimoRepo; now?: () => Date }
) {
  const motivo = input.motivo.trim();
  if (!motivo) {
    throw new EmprestimoError("Motivo do empréstimo é obrigatório.", 400);
  }

  const uniqueIds = Array.from(
    new Set(input.equipamentoIds.map((id) => id.trim()).filter(Boolean))
  );
  if (uniqueIds.length === 0) {
    throw new EmprestimoError(
      "Selecione pelo menos um equipamento para o empréstimo.",
      400
    );
  }

  const previsaoDevolucao = input.previsaoDevolucao ?? null;
  if (previsaoDevolucao && Number.isNaN(previsaoDevolucao.getTime())) {
    throw new EmprestimoError("Previsão de devolução inválida.", 400);
  }

  const responsavel = await repo.findResponsavel(input.responsavelId);
  if (!responsavel) {
    throw new EmprestimoError("Responsável não encontrado.", 404);
  }
  if (!responsavel.ativo) {
    throw new EmprestimoError(
      "Este responsável está inativo e não pode realizar retiradas.",
      400
    );
  }

  const equipamentos = await repo.findEquipamentosByIds(uniqueIds);
  if (equipamentos.length !== uniqueIds.length) {
    throw new EmprestimoError(
      "Um ou mais equipamentos selecionados não foram encontrados.",
      404
    );
  }

  for (const eq of equipamentos) {
    if (!eq.emprestavel) {
      throw new EmprestimoError(
        `O equipamento "${eq.nome}" está marcado como não emprestável.`,
        400
      );
    }
    if (eq.status !== "DISPONIVEL") {
      throw new EmprestimoError(
        `O equipamento "${eq.nome}" não está disponível no momento.`,
        409
      );
    }
  }

  const retiradoEm = now();
  const emprestimo = await repo.createEmprestimoComItens({
    responsavelId: responsavel.id,
    retiradoEm,
    previsaoDevolucao,
    motivo,
    equipamentoIds: uniqueIds,
  });

  await repo.markEquipamentosEmprestados(uniqueIds);
  await repo.createMovimentacoesRetirada({
    emprestimoId: emprestimo.id,
    responsavelId: responsavel.id,
    equipamentoIds: uniqueIds,
    motivo,
    previsaoDevolucao,
  });

  return {
    emprestimo,
    itensCount: uniqueIds.length,
    pendenciasReposicao: responsavel.pendenciasReposicao,
  };
}
