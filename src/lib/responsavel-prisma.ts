import { prisma } from "./prisma";
import {
  buildResponsavelWhere,
  type ResponsavelFiltros,
  type ResponsavelRepo,
} from "./responsavel";

const RESPONSAVEL_SELECT = {
  id: true,
  matricula: true,
  nome: true,
  tipo: true,
  contato: true,
  ativo: true,
} as const;

export const responsavelPrismaRepo: ResponsavelRepo = {
  findById: (id) =>
    prisma.responsavel.findUnique({
      where: { id },
      select: RESPONSAVEL_SELECT,
    }),
  findByMatricula: (matricula) =>
    prisma.responsavel.findUnique({
      where: { matricula },
      select: RESPONSAVEL_SELECT,
    }),
  create: (data) =>
    prisma.responsavel.create({
      data,
      select: RESPONSAVEL_SELECT,
    }),
  update: (id, data) =>
    prisma.responsavel.update({
      where: { id },
      data,
      select: RESPONSAVEL_SELECT,
    }),
};

/** Lists Responsáveis matching filters along with pending replacement counts. */
export async function listarResponsaveisComPendencias(
  filtros: ResponsavelFiltros
) {
  const rows = await prisma.responsavel.findMany({
    where: buildResponsavelWhere(filtros),
    orderBy: { nome: "asc" },
    select: {
      ...RESPONSAVEL_SELECT,
      _count: {
        select: {
          ocorrencias: {
            where: {
              deveRepor: true,
              reposicaoConcluidaEm: null,
            },
          },
        },
      },
    },
  });

  return rows.map(({ _count, ...rest }) => ({
    ...rest,
    pendenciasReposicao: _count.ocorrencias,
  }));
}
