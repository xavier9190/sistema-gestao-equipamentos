import type { EquipamentoStatus } from "@prisma/client";

export class EquipamentoBuscaError extends Error {
  readonly httpStatus: 400 | 404;

  constructor(message: string, httpStatus: 400 | 404 = 400) {
    super(message);
    this.name = "EquipamentoBuscaError";
    this.httpStatus = httpStatus;
  }
}

export interface AcessorioResumo {
  id: string;
  nome: string;
  codigoPatrimonio: string | null;
  codigoInterno: string | null;
}

export interface EmprestimoAtivoResumo {
  emprestimoId: string;
  responsavelNome: string;
  responsavelMatricula: string;
  retiradoEm: string;
  previsaoDevolucao: string | null;
}

export interface EquipamentoBuscaRecord {
  id: string;
  nome: string;
  codigoPatrimonio: string | null;
  codigoInterno: string | null;
  categoria: string;
  localizacao: string;
  status: EquipamentoStatus;
  emprestavel: boolean;
  acessoriosDisponiveis: AcessorioResumo[];
  emprestimoAtivo: EmprestimoAtivoResumo | null;
}

export interface EquipamentoBuscaRepo {
  findByCodigo: (codigo: string) => Promise<EquipamentoBuscaRecord | null>;
}

/** Trims scanner/manual input and collapses repeated whitespace. */
export function normalizarCodigoLido(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Looks up an equipment item by patrimonio or internal code. */
export async function buscarEquipamentoPorCodigo(
  rawCodigo: string,
  { repo }: { repo: EquipamentoBuscaRepo }
): Promise<EquipamentoBuscaRecord> {
  const codigo = normalizarCodigoLido(rawCodigo);
  if (!codigo) {
    throw new EquipamentoBuscaError(
      "Informe um código de patrimônio ou código interno.",
      400
    );
  }

  const equipamento = await repo.findByCodigo(codigo);
  if (!equipamento) {
    throw new EquipamentoBuscaError(
      `Nenhum equipamento encontrado para o código "${codigo}".`,
      404
    );
  }

  return equipamento;
}
