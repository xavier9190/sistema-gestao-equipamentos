import { NextResponse } from "next/server";
import { z } from "zod";
import { DevolucaoError, registrarDevolucao } from "@/lib/devolucao";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const registrarDevolucaoSchema = z.object({
  emprestimoId: z.string().trim().min(1, "Selecione um empréstimo."),
  itens: z
    .array(
      z.object({
        emprestimoItemId: z.string().trim().min(1, "Item inválido."),
        condicaoDevolucao: z.enum(["BOM_ESTADO", "COM_DEFEITO", "DANIFICADO"]),
      })
    )
    .min(1, "Selecione pelo menos um item para registrar a devolução."),
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

  const parsed = registrarDevolucaoSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Dados inválidos.";
    return NextResponse.json(
      { ok: false, message: firstIssue },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      return registrarDevolucao(
        {
          emprestimoId: parsed.data.emprestimoId,
          itens: parsed.data.itens,
        },
        {
          repo: {
            findEmprestimoComItens: (emprestimoId) =>
              tx.emprestimo.findUnique({
                where: { id: emprestimoId },
                select: {
                  id: true,
                  responsavelId: true,
                  encerradoEm: true,
                  itens: {
                    select: {
                      id: true,
                      equipamentoId: true,
                      devolvidoEm: true,
                    },
                  },
                },
              }),
            marcarItemDevolvido: async (
              emprestimoItemId,
              devolvidoEm,
              condicaoDevolucao
            ) => {
              const updated = await tx.emprestimoItem.updateMany({
                where: { id: emprestimoItemId, devolvidoEm: null },
                data: { devolvidoEm, condicaoDevolucao },
              });
              return updated.count > 0;
            },
            countItensPendentes: (emprestimoId) =>
              tx.emprestimoItem.count({
                where: { emprestimoId, devolvidoEm: null },
              }),
            atualizarStatusEquipamento: async (
              equipamentoId,
              status,
              estadoConservacao
            ) => {
              await tx.equipamento.update({
                where: { id: equipamentoId },
                data: { status, estadoConservacao },
              });
            },
            createMovimentacaoDevolucao: async (data) => {
              await tx.movimentacao.create({
                data: {
                  equipamentoId: data.equipamentoId,
                  responsavelId: data.responsavelId,
                  tipoEvento: "DEVOLUCAO",
                  registradoPor: "Coordenação",
                  detalhes: {
                    emprestimoId: data.emprestimoId,
                    condicaoDevolucao: data.condicaoDevolucao,
                    statusDestino: data.statusDestino,
                  },
                },
              });
            },
            encerrarEmprestimo: async (emprestimoId, encerradoEm) => {
              await tx.emprestimo.update({
                where: { id: emprestimoId },
                data: { encerradoEm },
              });
            },
          },
        }
      );
    });

    logger.info("devolucao.registered", {
      emprestimoId: result.emprestimoId,
      itensDevolvidosCount: result.itensDevolvidosCount,
      itensRestantesCount: result.itensRestantesCount,
      encerrado: result.encerrado,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (err) {
    if (err instanceof DevolucaoError) {
      return NextResponse.json(
        { ok: false, message: err.message },
        { status: err.httpStatus }
      );
    }

    logger.error("devolucao.register.error", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, message: "Erro interno ao registrar devolução." },
      { status: 500 }
    );
  }
}
