import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  cadastrarEquipamentoManual,
  EquipamentoCadastroError,
} from "@/lib/equipamento-cadastro";
import {
  buildEquipamentoWhere,
  parseEquipamentoFiltros,
} from "@/lib/equipamento-filtro";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const criarEquipamentoSchema = z.object({
  nome: z.string().trim().min(1, "Nome do equipamento é obrigatório."),
  codigoPatrimonio: z.string().trim().nullable().optional(),
  categoriaId: z.string().min(1, "Categoria é obrigatória."),
  localizacao: z.string().trim().min(1, "Localização é obrigatória."),
  estadoConservacao: z
    .enum(["BOM", "REGULAR", "COM_DEFEITO", "DANIFICADO"])
    .optional(),
  valorAproximado: z.number().nonnegative().nullable().optional(),
  emprestavel: z.boolean().optional(),
  equipamentoPrincipalId: z.string().trim().nullable().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filtros = parseEquipamentoFiltros({
    q: searchParams.get("q") ?? undefined,
    categoriaId: searchParams.get("categoriaId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    localizacao: searchParams.get("localizacao") ?? undefined,
    emprestavel: searchParams.get("emprestavel") ?? undefined,
  });

  const equipamentos = await prisma.equipamento.findMany({
    where: buildEquipamentoWhere(filtros),
    orderBy: { criadoEm: "desc" },
    include: {
      categoria: { select: { id: true, nome: true } },
      equipamentoPrincipal: {
        select: {
          id: true,
          nome: true,
          codigoPatrimonio: true,
          codigoInterno: true,
        },
      },
      _count: { select: { acessorios: true } },
    },
  });

  return NextResponse.json(
    {
      equipamentos: equipamentos.map((eq) => ({
        ...eq,
        valorAproximado: eq.valorAproximado ? Number(eq.valorAproximado) : null,
      })),
    },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }

  const parsed = criarEquipamentoSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Dados inválidos.";
    return NextResponse.json(
      { ok: false, message: firstIssue },
      { status: 400 }
    );
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      return cadastrarEquipamentoManual(parsed.data, {
        repo: {
          categoriaExists: async (categoriaId) => {
            const cat = await tx.categoria.findUnique({
              where: { id: categoriaId },
              select: { id: true },
            });
            return cat !== null;
          },
          findEquipamentoPrincipal: (id) =>
            tx.equipamento.findUnique({
              where: { id },
              select: { id: true, equipamentoPrincipalId: true },
            }),
          findExistingInternalCodes: async () => {
            const rows = await tx.equipamento.findMany({
              where: { codigoInterno: { not: null } },
              select: { codigoInterno: true },
            });
            return rows
              .map((r) => r.codigoInterno)
              .filter((code): code is string => code !== null);
          },
          findByCodigoPatrimonio: (codigoPatrimonio) =>
            tx.equipamento.findUnique({
              where: { codigoPatrimonio },
              select: { id: true },
            }),
          createEquipamento: async (data) => {
            const record = await tx.equipamento.create({
              data: {
                nome: data.nome,
                codigoPatrimonio: data.codigoPatrimonio,
                codigoInterno: data.codigoInterno,
                categoriaId: data.categoriaId,
                localizacao: data.localizacao,
                estadoConservacao: data.estadoConservacao,
                valorAproximado:
                  data.valorAproximado !== null
                    ? new Prisma.Decimal(data.valorAproximado)
                    : null,
                emprestavel: data.emprestavel,
                equipamentoPrincipalId: data.equipamentoPrincipalId,
              },
            });

            return {
              ...record,
              valorAproximado: record.valorAproximado
                ? Number(record.valorAproximado)
                : null,
            };
          },
          createMovimentacaoCadastro: async ({ equipamentoId, detalhes }) => {
            await tx.movimentacao.create({
              data: {
                equipamentoId,
                tipoEvento: "CADASTRO",
                detalhes,
                registradoPor: "Coordenação",
              },
            });
          },
        },
      });
    });

    logger.info("equipamento.cadastro_manual", {
      equipamentoId: created.id,
      codigoInterno: created.codigoInterno,
      codigoPatrimonio: created.codigoPatrimonio,
    });

    return NextResponse.json(
      { ok: true, equipamento: created },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof EquipamentoCadastroError) {
      return NextResponse.json(
        { ok: false, message: err.message },
        { status: err.httpStatus }
      );
    }

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { ok: false, message: "Conflito de código já cadastrado. Tente novamente." },
        { status: 409 }
      );
    }

    logger.error("equipamento.cadastro_manual.error", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, message: "Erro interno ao cadastrar equipamento." },
      { status: 500 }
    );
  }
}
