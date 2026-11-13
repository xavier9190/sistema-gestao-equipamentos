import type { EquipamentoStatus, EstadoConservacao } from "@prisma/client";
import { proximoCodigoInterno } from "./codigo-interno";

export class EquipamentoCadastroError extends Error {
  readonly httpStatus: 400 | 404 | 409;

  constructor(message: string, httpStatus: 400 | 404 | 409 = 400) {
    super(message);
    this.name = "EquipamentoCadastroError";
    this.httpStatus = httpStatus;
  }
}

export interface CadastrarEquipamentoInput {
  nome: string;
  codigoPatrimonio?: string | null;
  categoriaId: string;
  localizacao: string;
  estadoConservacao?: EstadoConservacao;
  valorAproximado?: number | null;
  emprestavel?: boolean;
  equipamentoPrincipalId?: string | null;
}

export interface EquipamentoCriadoRecord {
  id: string;
  nome: string;
  codigoPatrimonio: string | null;
  codigoInterno: string | null;
  categoriaId: string;
  localizacao: string;
  estadoConservacao: EstadoConservacao;
  valorAproximado: number | null;
  emprestavel: boolean;
  status: EquipamentoStatus;
  equipamentoPrincipalId: string | null;
}

export interface EquipamentoCadastroRepo {
  categoriaExists: (categoriaId: string) => Promise<boolean>;
  findEquipamentoPrincipal: (
    id: string
  ) => Promise<{ id: string; equipamentoPrincipalId: string | null } | null>;
  findExistingInternalCodes: () => Promise<string[]>;
  findByCodigoPatrimonio: (
    codigoPatrimonio: string
  ) => Promise<{ id: string } | null>;
  createEquipamento: (data: {
    nome: string;
    codigoPatrimonio: string | null;
    codigoInterno: string | null;
    categoriaId: string;
    localizacao: string;
    estadoConservacao: EstadoConservacao;
    valorAproximado: number | null;
    emprestavel: boolean;
    equipamentoPrincipalId: string | null;
  }) => Promise<EquipamentoCriadoRecord>;
  createMovimentacaoCadastro: (data: {
    equipamentoId: string;
    detalhes: Record<string, string | null>;
  }) => Promise<void>;
}

/**
 * Registers a manual equipment item (generating INT-XXXX when without codigoPatrimonio),
 * validates optional accessory linking, and appends an immutable CADASTRO movement.
 */
export async function cadastrarEquipamentoManual(
  input: CadastrarEquipamentoInput,
  { repo }: { repo: EquipamentoCadastroRepo }
): Promise<EquipamentoCriadoRecord> {
  const nome = input.nome.trim();
  const localizacao = input.localizacao.trim();
  const codigoPatrimonio = input.codigoPatrimonio?.trim() || null;
  const equipamentoPrincipalId = input.equipamentoPrincipalId?.trim() || null;

  if (!nome) {
    throw new EquipamentoCadastroError("Nome do equipamento é obrigatório.", 400);
  }
  if (!localizacao) {
    throw new EquipamentoCadastroError("Localização é obrigatória.", 400);
  }

  const categoriaValida = await repo.categoriaExists(input.categoriaId);
  if (!categoriaValida) {
    throw new EquipamentoCadastroError("Categoria não encontrada.", 404);
  }

  if (codigoPatrimonio) {
    const existing = await repo.findByCodigoPatrimonio(codigoPatrimonio);
    if (existing) {
      throw new EquipamentoCadastroError(
        "Já existe um equipamento com este código de patrimônio.",
        409
      );
    }
  }

  if (equipamentoPrincipalId) {
    const principal = await repo.findEquipamentoPrincipal(equipamentoPrincipalId);
    if (!principal) {
      throw new EquipamentoCadastroError(
        "Equipamento principal não encontrado.",
        404
      );
    }
    if (principal.equipamentoPrincipalId !== null) {
      throw new EquipamentoCadastroError(
        "Não é permitido vincular acessório a outro acessório.",
        400
      );
    }
  }

  let codigoInterno: string | null = null;
  if (!codigoPatrimonio) {
    const existingCodes = await repo.findExistingInternalCodes();
    codigoInterno = proximoCodigoInterno(existingCodes);
  }

  const created = await repo.createEquipamento({
    nome,
    codigoPatrimonio,
    codigoInterno,
    categoriaId: input.categoriaId,
    localizacao,
    estadoConservacao: input.estadoConservacao ?? "BOM",
    valorAproximado: input.valorAproximado ?? null,
    emprestavel: input.emprestavel ?? true,
    equipamentoPrincipalId,
  });

  await repo.createMovimentacaoCadastro({
    equipamentoId: created.id,
    detalhes: {
      origem: "cadastro_manual",
      nome: created.nome,
      codigoPatrimonio: created.codigoPatrimonio,
      codigoInterno: created.codigoInterno,
      categoriaId: created.categoriaId,
      localizacao: created.localizacao,
      equipamentoPrincipalId: created.equipamentoPrincipalId,
    },
  });

  return created;
}
