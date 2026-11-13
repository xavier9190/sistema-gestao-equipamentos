import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { EmprestimoError, registrarEmprestimo } from "@/lib/emprestimo";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const criarEmprestimoSchema = z.object({
  responsavelId: z.string().min(1, "Selecione um responsável."),
  equipamentoIds: z
    .array(z.string().min(1))
    .min(1, "Adicione pelo menos um equipamento."),
  motivo: z.string().trim().min(1, "Informe o motivo do empréstimo."),
  previsaoDevolucao: z.string().nullable().optional(),
});

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

  const parsed = criarEmprestimoSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Dados inválidos.";
    return NextResponse.json(
      { ok: false, message: firstIssue },
      { status: 400 }
    );
  }

  const previsaoDevolucao = parsed.data.previsaoDevolucao
    ? new Date(parsed.data.previsaoDevolucao)
    : null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      return registrarEmprestimo(
        {
          responsavelId: parsed.data.responsavelId,
          equipamentoIds: parsed.data.equipamentoIds,
          motivo: parsed.data.motivo,
          previsaoDevolucao,
        },
        {
          repo: {
            findResponsavel: async (id) => {
              const resp = await tx.responsavel.findUnique({
                where: { id },
                select: {
                  id: true,
                  ativo: true,
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
              if (!resp) return null;
              return {
                id: resp.id,
                ativo: resp.ativo,
                pendenciasReposicao: resp._count.ocorrencias,
              };
            },
            findEquipamentosByIds: (ids) =>
              tx.equipamento.findMany({
                where: { id: { in: ids } },
                select: {
                  id: true,
                  nome: true,
                  status: true,
                  emprestavel: true,
                },
              }),
            createEmprestimoComItens: (data) =>
              tx.emprestimo.create({
                data: {
                  responsavelId: data.responsavelId,
                  retiradoEm: data.retiradoEm,
                  previsaoDevolucao: data.previsaoDevolucao,
                  motivo: data.motivo,
                  itens: {
                    create: data.equipamentoIds.map((equipamentoId) => ({
                      equipamentoId,
                    })),
                  },
                },
                select: {
                  id: true,
                  responsavelId: true,
                  retiradoEm: true,
                  previsaoDevolucao: true,
                  motivo: true,
                },
              }),
            markEquipamentosEmprestados: async (equipamentoIds) => {
              await tx.equipamento.updateMany({
                where: { id: { in: equipamentoIds }, status: "DISPONIVEL" },
                data: { status: "EMPRESTADO" },
              });
            },
            createMovimentacoesRetirada: async (data) => {
              await tx.movimentacao.createMany({
                data: data.equipamentoIds.map((equipamentoId) => ({
                  equipamentoId,
                  responsavelId: data.responsavelId,
                  tipoEvento: "RETIRADA",
                  registradoPor: "Coordenação",
                  detalhes: {
                    emprestimoId: data.emprestimoId,
                    motivo: data.motivo,
                    previsaoDevolucao: data.previsaoDevolucao
                      ? data.previsaoDevolucao.toISOString()
                      : null,
                  },
                })),
              });
            },
          },
        }
      );
    });

    logger.info("emprestimo.created", {
      emprestimoId: result.emprestimo.id,
      responsavelId: result.emprestimo.responsavelId,
      itensCount: result.itensCount,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (err) {
    if (err instanceof EmprestimoError) {
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
        {
          ok: false,
          message:
            "Um dos equipamentos selecionados acabou de ser emprestado em outra operação.",
        },
        { status: 409 }
      );
    }

    logger.error("emprestimo.create.error", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, message: "Erro interno ao registrar empréstimo." },
      { status: 500 }
    );
  }
}
