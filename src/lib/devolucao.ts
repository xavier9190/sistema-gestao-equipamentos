import type {
  CondicaoDevolucao,
  EquipamentoStatus,
  EstadoConservacao,
} from "@prisma/client";

export class DevolucaoError extends Error {
  readonly httpStatus: 400 | 404 | 409;

  constructor(message: string, httpStatus: 400 | 404 | 409 = 400) {
    super(message);
    this.name = "DevolucaoError";
    this.httpStatus = httpStatus;
  }
}

export function statusDestinoPorCondicao(
  condicao: CondicaoDevolucao
): EquipamentoStatus {
  return condicao === "BOM_ESTADO" ? "DISPONIVEL" : "EM_MANUTENCAO";
}

function estadoConservacaoPorCondicao(
  condicao: CondicaoDevolucao
): EstadoConservacao {
  switch (condicao) {
    case "BOM_ESTADO":
      return "BOM";
    case "COM_DEFEITO":
      return "COM_DEFEITO";
    case "DANIFICADO":
      return "DANIFICADO";
  }
}

export interface EmprestimoItemParaDevolucao {
  id: string;
  equipamentoId: string;
  devolvidoEm: Date | null;
}

export interface EmprestimoParaDevolucao {
  id: string;
  responsavelId: string;
  encerradoEm: Date | null;
  itens: EmprestimoItemParaDevolucao[];
}

export interface DevolucaoRepo {
  findEmprestimoComItens: (
    emprestimoId: string
  ) => Promise<EmprestimoParaDevolucao | null>;
  marcarItemDevolvido: (
    emprestimoItemId: string,
    devolvidoEm: Date,
    condicaoDevolucao: CondicaoDevolucao
  ) => Promise<boolean>;
  countItensPendentes: (emprestimoId: string) => Promise<number>;
  atualizarStatusEquipamento: (
    equipamentoId: string,
    status: EquipamentoStatus,
    estadoConservacao: EstadoConservacao
  ) => Promise<void>;
  createMovimentacaoDevolucao: (data: {
    emprestimoId: string;
    responsavelId: string;
    equipamentoId: string;
    condicaoDevolucao: CondicaoDevolucao;
    statusDestino: EquipamentoStatus;
  }) => Promise<void>;
  encerrarEmprestimo: (emprestimoId: string, encerradoEm: Date) => Promise<void>;
}

export interface ItemDevolucaoInput {
  emprestimoItemId: string;
  condicaoDevolucao: CondicaoDevolucao;
}

export interface RegistrarDevolucaoInput {
  emprestimoId: string;
  itens: ItemDevolucaoInput[];
}

/**
 * Registers full or partial item-by-item return, updates equipment status
 * based on return condition, records immutable DEVOLUCAO movements, and
 * closes the loan when all items have been returned.
 */
export async function registrarDevolucao(
  input: RegistrarDevolucaoInput,
  { repo, now = () => new Date() }: { repo: DevolucaoRepo; now?: () => Date }
) {
  if (input.itens.length === 0) {
    throw new DevolucaoError(
      "Selecione pelo menos um item para registrar a devolução.",
      400
    );
  }

  const seenIds = new Set<string>();
  const itensUnicos: ItemDevolucaoInput[] = [];
  for (const item of input.itens) {
    if (seenIds.has(item.emprestimoItemId)) {
      throw new DevolucaoError(
        "Item duplicado na lista de devolução.",
        400
      );
    }
    seenIds.add(item.emprestimoItemId);
    itensUnicos.push(item);
  }

  const emprestimo = await repo.findEmprestimoComItens(input.emprestimoId);
  if (!emprestimo) {
    throw new DevolucaoError("Empréstimo não encontrado.", 404);
  }
  if (emprestimo.encerradoEm !== null) {
    throw new DevolucaoError("Este empréstimo já foi encerrado.", 409);
  }

  const itemById = new Map(emprestimo.itens.map((i) => [i.id, i]));
  for (const itemInput of itensUnicos) {
    const existingItem = itemById.get(itemInput.emprestimoItemId);
    if (!existingItem) {
      throw new DevolucaoError(
        "Um dos itens informados não pertence a este empréstimo.",
        404
      );
    }
    if (existingItem.devolvidoEm !== null) {
      throw new DevolucaoError("Um dos itens selecionados já foi devolvido.", 409);
    }
  }

  const devolvidoEm = now();
  const itensComProblema: Array<{
    equipamentoId: string;
    condicaoDevolucao: CondicaoDevolucao;
  }> = [];

  for (const itemInput of itensUnicos) {
    const existingItem = itemById.get(itemInput.emprestimoItemId)!;
    const statusDestino = statusDestinoPorCondicao(itemInput.condicaoDevolucao);
    const estadoConservacao = estadoConservacaoPorCondicao(
      itemInput.condicaoDevolucao
    );

    const marcado = await repo.marcarItemDevolvido(
      existingItem.id,
      devolvidoEm,
      itemInput.condicaoDevolucao
    );
    if (!marcado) {
      throw new DevolucaoError(
        "Um dos itens selecionados já foi devolvido.",
        409
      );
    }
    await repo.atualizarStatusEquipamento(
      existingItem.equipamentoId,
      statusDestino,
      estadoConservacao
    );
    await repo.createMovimentacaoDevolucao({
      emprestimoId: emprestimo.id,
      responsavelId: emprestimo.responsavelId,
      equipamentoId: existingItem.equipamentoId,
      condicaoDevolucao: itemInput.condicaoDevolucao,
      statusDestino,
    });

    if (itemInput.condicaoDevolucao !== "BOM_ESTADO") {
      itensComProblema.push({
        equipamentoId: existingItem.equipamentoId,
        condicaoDevolucao: itemInput.condicaoDevolucao,
      });
    }
  }

  const itensRestantesCount = await repo.countItensPendentes(emprestimo.id);
  const encerrado = itensRestantesCount === 0;

  if (encerrado) {
    await repo.encerrarEmprestimo(emprestimo.id, devolvidoEm);
  }

  return {
    emprestimoId: emprestimo.id,
    encerrado,
    parcial: !encerrado,
    itensDevolvidosCount: itensUnicos.length,
    itensRestantesCount,
    itensComProblema,
  };
}
