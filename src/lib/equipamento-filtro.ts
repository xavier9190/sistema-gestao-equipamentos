import type { EquipamentoStatus, Prisma } from "@prisma/client";

const VALID_STATUSES = new Set<EquipamentoStatus>([
  "DISPONIVEL",
  "EMPRESTADO",
  "EM_MANUTENCAO",
  "EXTRAVIADO",
]);

export interface EquipamentoFiltros {
  q?: string;
  categoriaId?: string;
  status?: EquipamentoStatus;
  localizacao?: string;
  emprestavel?: boolean;
}

function firstString(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/** Parses and sanitizes query/search parameters for the equipment listing. */
export function parseEquipamentoFiltros(
  params: Record<string, string | string[] | undefined>
): EquipamentoFiltros {
  const rawStatus = firstString(params.status);
  const status =
    rawStatus && VALID_STATUSES.has(rawStatus as EquipamentoStatus)
      ? (rawStatus as EquipamentoStatus)
      : undefined;

  const rawEmprestavel = firstString(params.emprestavel);
  let emprestavel: boolean | undefined;
  if (rawEmprestavel === "true") {
    emprestavel = true;
  } else if (rawEmprestavel === "false") {
    emprestavel = false;
  }

  return {
    q: firstString(params.q),
    categoriaId: firstString(params.categoriaId),
    status,
    localizacao: firstString(params.localizacao),
    emprestavel,
  };
}

/** Builds a Prisma `where` filter from parsed equipment listing filters. */
export function buildEquipamentoWhere(
  filtros: EquipamentoFiltros
): Prisma.EquipamentoWhereInput {
  const where: Prisma.EquipamentoWhereInput = {};

  if (filtros.q) {
    where.OR = [
      { nome: { contains: filtros.q, mode: "insensitive" } },
      { codigoPatrimonio: { contains: filtros.q, mode: "insensitive" } },
      { codigoInterno: { contains: filtros.q, mode: "insensitive" } },
    ];
  }

  if (filtros.categoriaId) {
    where.categoriaId = filtros.categoriaId;
  }

  if (filtros.status) {
    where.status = filtros.status;
  }

  if (filtros.localizacao) {
    where.localizacao = { contains: filtros.localizacao, mode: "insensitive" };
  }

  if (filtros.emprestavel !== undefined) {
    where.emprestavel = filtros.emprestavel;
  }

  return where;
}
