import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { concluirOcorrencia, OcorrenciaError } from "@/lib/ocorrencia";
import { prisma } from "@/lib/prisma";

const concluirSchema = z.object({
  observacao: z.string().trim().max(500).nullable().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown = {};
  try {
    const raw = await request.text();
    if (raw.trim()) {
      body = JSON.parse(raw);
    }
  } catch {
    return NextResponse.json(
      { ok: false, message: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }

  const parsed = concluirSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Observação inválida." },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      return concluirOcorrencia(
        {
          ocorrenciaId: id,
          observacao: parsed.data.observacao ?? null,
        },
        {
          repo: {
            updateEquipamentoEstado: async (
              equipamentoId,
              status,
              estadoConservacao
            ) => {
              await tx.equipamento.update({
                where: { id: equipamentoId },
                data: { status, estadoConservacao },
              });
            },
            createMovimentacao: async (data) => {
              await tx.movimentacao.create({
                data: {
                  equipamentoId: data.equipamentoId,
                  responsavelId: data.responsavelId,
                  tipoEvento: data.tipoEvento,
                  registradoPor: "Coordenação",
                  detalhes: data.detalhes as Prisma.InputJsonValue,
                },
              });
            },
            findOcorrenciaById: async (ocorrenciaId) => {
              const oc = await tx.ocorrencia.findUnique({
                where: { id: ocorrenciaId },
                select: {
                  id: true,
                  equipamentoId: true,
                  responsavelId: true,
                  tipo: true,
                  deveRepor: true,
                  reposicaoConcluidaEm: true,
                  equipamento: { select: { status: true } },
                },
              });
              if (!oc) return null;
              return {
                id: oc.id,
                equipamentoId: oc.equipamentoId,
                responsavelId: oc.responsavelId,
                tipo: oc.tipo,
                deveRepor: oc.deveRepor,
                reposicaoConcluidaEm: oc.reposicaoConcluidaEm,
                equipamentoStatus: oc.equipamento.status,
              };
            },
            marcarOcorrenciaConcluida: async (
              ocorrenciaId,
              reposicaoConcluidaEm
            ) => {
              const updated = await tx.ocorrencia.updateMany({
                where: { id: ocorrenciaId, reposicaoConcluidaEm: null },
                data: { reposicaoConcluidaEm },
              });
              return updated.count > 0;
            },
          },
        }
      );
    });

    logger.info("ocorrencia.concluded", {
      ocorrenciaId: result.ocorrenciaId,
      equipamentoId: result.equipamentoId,
      statusDestino: result.statusDestino,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (err) {
    if (err instanceof OcorrenciaError) {
      return NextResponse.json(
        { ok: false, message: err.message },
        { status: err.httpStatus }
      );
    }

    logger.error("ocorrencia.conclude.error", {
      ocorrenciaId: id,
      reason: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, message: "Erro interno ao concluir ocorrência." },
      { status: 500 }
    );
  }
}
