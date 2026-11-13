import type { Prisma, ResponsavelTipo } from "@prisma/client";

const VALID_TIPOS = new Set<ResponsavelTipo>(["DOCENTE", "DISCENTE", "SERVIDOR"]);

export const RESPONSAVEL_TIPO_LABEL: Record<ResponsavelTipo, string> = {
  DOCENTE: "Docente",
  DISCENTE: "Discente",
  SERVIDOR: "Servidor",
};

export class ResponsavelError extends Error {
  readonly httpStatus: 400 | 404 | 409;

  constructor(message: string, httpStatus: 400 | 404 | 409 = 400) {
    super(message);
    this.name = "ResponsavelError";
    this.httpStatus = httpStatus;
  }
}

export interface ResponsavelInput {
  matricula: string;
  nome: string;
  tipo: ResponsavelTipo;
  contato: string;
}

export interface ResponsavelRecord extends ResponsavelInput {
  id: string;
  ativo: boolean;
}

export interface ResponsavelRepo {
  findById: (id: string) => Promise<ResponsavelRecord | null>;
  findByMatricula: (matricula: string) => Promise<ResponsavelRecord | null>;
  create: (data: ResponsavelInput) => Promise<ResponsavelRecord>;
  update: (
    id: string,
    data: Partial<ResponsavelInput> & { ativo?: boolean }
  ) => Promise<ResponsavelRecord>;
}

export interface ResponsavelFiltros {
  q?: string;
  tipo?: ResponsavelTipo;
  ativo?: boolean;
}

function firstString(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/** Parses query parameters for searching and filtering Responsáveis. */
export function parseResponsavelFiltros(
  params: Record<string, string | string[] | undefined>
): ResponsavelFiltros {
  const rawTipo = firstString(params.tipo);
  const tipo =
    rawTipo && VALID_TIPOS.has(rawTipo as ResponsavelTipo)
      ? (rawTipo as ResponsavelTipo)
      : undefined;

  const rawAtivo = firstString(params.ativo);
  let ativo: boolean | undefined;
  if (rawAtivo === "true") {
    ativo = true;
  } else if (rawAtivo === "false") {
    ativo = false;
  }

  return {
    q: firstString(params.q),
    tipo,
    ativo,
  };
}

/** Builds a Prisma `where` clause for Responsáveis by matrícula, nome, tipo, and ativo. */
export function buildResponsavelWhere(
  filtros: ResponsavelFiltros
): Prisma.ResponsavelWhereInput {
  const where: Prisma.ResponsavelWhereInput = {};

  if (filtros.q) {
    where.OR = [
      { matricula: { contains: filtros.q, mode: "insensitive" } },
      { nome: { contains: filtros.q, mode: "insensitive" } },
    ];
  }

  if (filtros.tipo) {
    where.tipo = filtros.tipo;
  }

  if (filtros.ativo !== undefined) {
    where.ativo = filtros.ativo;
  }

  return where;
}

function normalizeInput(input: ResponsavelInput): ResponsavelInput {
  const matricula = input.matricula.trim();
  const nome = input.nome.trim();
  const contato = input.contato.trim();

  if (!matricula) {
    throw new ResponsavelError("Matrícula é obrigatória.", 400);
  }
  if (!nome) {
    throw new ResponsavelError("Nome é obrigatório.", 400);
  }
  if (!contato) {
    throw new ResponsavelError("Contato é obrigatório.", 400);
  }
  if (!VALID_TIPOS.has(input.tipo)) {
    throw new ResponsavelError("Tipo de responsável inválido.", 400);
  }

  return { matricula, nome, tipo: input.tipo, contato };
}

/** Creates a new Responsável after ensuring matrícula uniqueness. */
export async function criarResponsavel(
  input: ResponsavelInput,
  { repo }: { repo: ResponsavelRepo }
): Promise<ResponsavelRecord> {
  const normalized = normalizeInput(input);

  const existing = await repo.findByMatricula(normalized.matricula);
  if (existing) {
    throw new ResponsavelError(
      "Já existe um responsável cadastrado com esta matrícula.",
      409
    );
  }

  return repo.create(normalized);
}

/** Updates an existing Responsável while preserving matrícula uniqueness. */
export async function atualizarResponsavel(
  id: string,
  input: ResponsavelInput,
  { repo }: { repo: ResponsavelRepo }
): Promise<ResponsavelRecord> {
  const existing = await repo.findById(id);
  if (!existing) {
    throw new ResponsavelError("Responsável não encontrado.", 404);
  }

  const normalized = normalizeInput(input);
  if (normalized.matricula !== existing.matricula) {
    const conflict = await repo.findByMatricula(normalized.matricula);
    if (conflict && conflict.id !== id) {
      throw new ResponsavelError(
        "Já existe um responsável cadastrado com esta matrícula.",
        409
      );
    }
  }

  return repo.update(id, normalized);
}

/** Activates or deactivates a Responsável without deleting historical links. */
export async function alterarStatusResponsavel(
  id: string,
  ativo: boolean,
  { repo }: { repo: ResponsavelRepo }
): Promise<ResponsavelRecord> {
  const existing = await repo.findById(id);
  if (!existing) {
    throw new ResponsavelError("Responsável não encontrado.", 404);
  }

  return repo.update(id, { ativo });
}
