import type {
  CondicaoDevolucao,
  EquipamentoStatus,
  EstadoConservacao,
  MovimentacaoTipoEvento,
  OcorrenciaTipo,
} from "@prisma/client";

export class OcorrenciaError extends Error {
  readonly httpStatus: 400 | 404 | 409;

  constructor(message: string, httpStatus: 400 | 404 | 409 = 400) {
    super(message);
    this.name = "OcorrenciaError";
    this.httpStatus = httpStatus;
  }
}

export const OCORRENCIA_TIPO_LABEL: Record<OcorrenciaTipo, string> = {
  PERDA: "Perda",
  DANO: "Dano",
  DEFEITO: "Defeito",
};

/**
 * Computes the destination EquipamentoStatus for a given occurrence type and current status,
 * rejecting invalid transitions (e.g., recording a new occurrence on an already EXTRAVIADO item).
 */
export function transicaoStatusPorOcorrencia(
  statusAtual: EquipamentoStatus,
  tipo: OcorrenciaTipo,
  impedeUso: boolean
): EquipamentoStatus {
  if (statusAtual === "EXTRAVIADO") {
    throw new OcorrenciaError(
      "Equipamento extraviado precisa ter a reposição concluída antes de registrar nova ocorrência.",
      409
    );
  }

  if (tipo === "PERDA") {
    return "EXTRAVIADO";
  }

  if (statusAtual === "EM_MANUTENCAO") {
    return "EM_MANUTENCAO";
  }

  return impedeUso ? "EM_MANUTENCAO" : "DISPONIVEL";
}

function conservacaoPorOcorrencia(
  tipo: OcorrenciaTipo,
  atual: EstadoConservacao
): EstadoConservacao {
  switch (tipo) {
    case "PERDA":
    case "DANO":
      return "DANIFICADO";
    case "DEFEITO":
      return atual === "DANIFICADO" ? "DANIFICADO" : "COM_DEFEITO";
  }
}

export interface RegistrarOcorrenciaRepo {
  findEquipamento: (equipamentoId: string) => Promise<{
    id: string;
    status: EquipamentoStatus;
    estadoConservacao: EstadoConservacao;
  } | null>;
  findActiveEmprestimoItem: (equipamentoId: string) => Promise<{
    id: string;
    emprestimoId: string;
    responsavelId: string;
  } | null>;
  findResponsavelExists: (responsavelId: string) => Promise<boolean>;
  createOcorrencia: (data: {
    equipamentoId: string;
    emprestimoItemId: string | null;
    responsavelId: string | null;
    tipo: OcorrenciaTipo;
    descricao: string;
    deveRepor: boolean;
  }) => Promise<{
    id: string;
    equipamentoId: string;
    emprestimoItemId: string | null;
    responsavelId: string | null;
    tipo: OcorrenciaTipo;
    descricao: string;
    deveRepor: boolean;
    reposicaoConcluidaEm: Date | null;
    criadoEm: Date;
  }>;
  marcarEmprestimoItemEncerrado: (
    emprestimoItemId: string,
    devolvidoEm: Date,
    condicaoDevolucao: CondicaoDevolucao
  ) => Promise<void>;
  countItensPendentesEmprestimo: (emprestimoId: string) => Promise<number>;
  encerrarEmprestimo: (emprestimoId: string, encerradoEm: Date) => Promise<void>;
  updateEquipamentoEstado: (
    equipamentoId: string,
    status: EquipamentoStatus,
    estadoConservacao: EstadoConservacao
  ) => Promise<void>;
  createMovimentacao: (data: {
    equipamentoId: string;
    responsavelId: string | null;
    tipoEvento: MovimentacaoTipoEvento;
    detalhes: Record<string, unknown>;
  }) => Promise<void>;
}

export interface ConcluirOcorrenciaRepo {
  findOcorrenciaById: (ocorrenciaId: string) => Promise<{
    id: string;
    equipamentoId: string;
    responsavelId: string | null;
    tipo: OcorrenciaTipo;
    deveRepor: boolean;
    reposicaoConcluidaEm: Date | null;
    equipamentoStatus: EquipamentoStatus;
  } | null>;
  marcarOcorrenciaConcluida: (
    ocorrenciaId: string,
    reposicaoConcluidaEm: Date
  ) => Promise<boolean>;
  updateEquipamentoEstado: (
    equipamentoId: string,
    status: EquipamentoStatus,
    estadoConservacao: EstadoConservacao
  ) => Promise<void>;
  createMovimentacao: (data: {
    equipamentoId: string;
    responsavelId: string | null;
    tipoEvento: MovimentacaoTipoEvento;
    detalhes: Record<string, unknown>;
  }) => Promise<void>;
}

/**
 * Registers an occurrence (PERDA, DANO, DEFEITO), enforces valid equipment state transitions,
 * closes any active loan item if applicable, and writes an immutable Movimentacao(OCORRENCIA).
 */
export async function registrarOcorrencia(
  input: {
    equipamentoId: string;
    responsavelId?: string | null;
    tipo: OcorrenciaTipo;
    descricao: string;
    deveRepor: boolean;
    impedeUso: boolean;
  },
  {
    repo,
    now = () => new Date(),
  }: { repo: RegistrarOcorrenciaRepo; now?: () => Date }
) {
  const descricao = input.descricao.trim();
  if (!descricao) {
    throw new OcorrenciaError("Informe a descrição da ocorrência.", 400);
  }

  const equipamento = await repo.findEquipamento(input.equipamentoId);
  if (!equipamento) {
    throw new OcorrenciaError("Equipamento não encontrado.", 404);
  }

  const statusDestino = transicaoStatusPorOcorrencia(
    equipamento.status,
    input.tipo,
    input.impedeUso
  );
  const conservacaoDestino = conservacaoPorOcorrencia(
    input.tipo,
    equipamento.estadoConservacao
  );

  const activeItem = await repo.findActiveEmprestimoItem(equipamento.id);
  const responsavelId =
    input.responsavelId?.trim() || activeItem?.responsavelId || null;

  if (input.deveRepor && !responsavelId) {
    throw new OcorrenciaError(
      "Informe o responsável pela reposição quando 'Deve repor' estiver marcado.",
      400
    );
  }

  if (responsavelId) {
    const respExists = await repo.findResponsavelExists(responsavelId);
    if (!respExists) {
      throw new OcorrenciaError("Responsável não encontrado.", 404);
    }
  }

  const occurredAt = now();

  const ocorrencia = await repo.createOcorrencia({
    equipamentoId: equipamento.id,
    emprestimoItemId: activeItem?.id ?? null,
    responsavelId,
    tipo: input.tipo,
    descricao,
    deveRepor: input.deveRepor,
  });

  if (activeItem) {
    const condicao: CondicaoDevolucao =
      input.tipo === "DEFEITO" ? "COM_DEFEITO" : "DANIFICADO";
    await repo.marcarEmprestimoItemEncerrado(activeItem.id, occurredAt, condicao);
    const pendentes = await repo.countItensPendentesEmprestimo(
      activeItem.emprestimoId
    );
    if (pendentes === 0) {
      await repo.encerrarEmprestimo(activeItem.emprestimoId, occurredAt);
    }
  }

  await repo.updateEquipamentoEstado(
    equipamento.id,
    statusDestino,
    conservacaoDestino
  );

  await repo.createMovimentacao({
    equipamentoId: equipamento.id,
    responsavelId,
    tipoEvento: "OCORRENCIA",
    detalhes: {
      ocorrenciaId: ocorrencia.id,
      tipo: input.tipo,
      motivo: descricao,
      deveRepor: input.deveRepor,
      statusAnterior: equipamento.status,
      statusDestino,
    },
  });

  return {
    ocorrencia,
    statusAnterior: equipamento.status,
    statusDestino,
  };
}

/**
 * Concludes an open occurrence (replacement completed or returned from maintenance),
 * restoring Equipamento.status to DISPONIVEL and recording Movimentacao(REPOSICAO).
 */
export async function concluirOcorrencia(
  input: {
    ocorrenciaId: string;
    observacao?: string | null;
  },
  {
    repo,
    now = () => new Date(),
  }: { repo: ConcluirOcorrenciaRepo; now?: () => Date }
) {
  const existing = await repo.findOcorrenciaById(input.ocorrenciaId);
  if (!existing) {
    throw new OcorrenciaError("Ocorrência não encontrada.", 404);
  }
  if (existing.reposicaoConcluidaEm !== null) {
    throw new OcorrenciaError("Esta ocorrência já foi concluída.", 409);
  }

  const concludedAt = now();
  const marcado = await repo.marcarOcorrenciaConcluida(
    existing.id,
    concludedAt
  );
  if (!marcado) {
    throw new OcorrenciaError("Esta ocorrência já foi concluída.", 409);
  }

  const emEmprestimoAtivo = existing.equipamentoStatus === "EMPRESTADO";
  const statusDestino: EquipamentoStatus = emEmprestimoAtivo
    ? "EMPRESTADO"
    : "DISPONIVEL";

  if (!emEmprestimoAtivo) {
    await repo.updateEquipamentoEstado(
      existing.equipamentoId,
      statusDestino,
      "BOM"
    );
  }

  const motivo =
    input.observacao?.trim() ||
    (existing.deveRepor
      ? "Reposição concluída"
      : "Retorno da manutenção concluído");

  await repo.createMovimentacao({
    equipamentoId: existing.equipamentoId,
    responsavelId: existing.responsavelId,
    tipoEvento: "REPOSICAO",
    detalhes: {
      ocorrenciaId: existing.id,
      tipoOcorrencia: existing.tipo,
      motivo,
      statusAnterior: existing.equipamentoStatus,
      statusDestino,
    },
  });

  return {
    ocorrenciaId: existing.id,
    equipamentoId: existing.equipamentoId,
    reposicaoConcluidaEm: concludedAt,
    statusAnterior: existing.equipamentoStatus,
    statusDestino,
  };
}
