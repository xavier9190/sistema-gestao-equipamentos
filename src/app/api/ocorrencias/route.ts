import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { OcorrenciaError, registrarOcorrencia } from "@/lib/ocorrencia";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const criarOcorrenciaSchema = z.object({
  equipamentoId: z.string().trim().min(1, "Informe o equipamento."),
  responsavelId: z.string().trim().nullable().optional(),
  tipo: z.enum(["PERDA", "DANO", "DEFEITO"]),
  descricao: z.string().trim().min(1, "Informe a descrição da ocorrência."),
  deveRepor: z.boolean().default(false),
  impedeUso: z.boolean().default(true),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const equipamentoId = searchParams.get("equipamentoId")?.trim() ?? "";
  const pendentes = searchParams.get("pendentes") === "true";

  try {
    const ocorrencias = await prisma.ocorrencia.findMany({
      where: {
        ...(equipamentoId ? { equipamentoId } : {}),
        ...(pendentes ? { reposicaoConcluidaEm: null } : {}),
      },
      orderBy: { criadoEm: "desc" },
      take: 50,
      select: {
        id: true,
        equipamentoId: true,
        tipo: true,
        descricao: true,
        deveRepor: true,
        reposicaoConcluidaEm: true,
        criadoEm: true,
        equipamento: {
          select: {
            id: true,
            nome: true,
            codigoPatrimonio: true,
            codigoInterno: true,
            status: true,
          },
        },
        responsavel: {
          select: {
            id: true,
            nome: true,
            matricula: true,
            contato: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, ocorrencias });
  } catch (err) {
    logger.error("ocorrencia.list.error", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, message: "Erro ao consultar ocorrências." },
      { status: 500 }
    );
  }
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

  const parsed = criarOcorrenciaSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Dados inválidos.";
    return NextResponse.json(
      { ok: false, message: firstIssue },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      return registrarOcorrencia(
        {
          equipamentoId: parsed.data.equipamentoId,
          responsavelId: parsed.data.responsavelId ?? null,
          tipo: parsed.data.tipo,
          descricao: parsed.data.descricao,
          deveRepor: parsed.data.deveRepor,
          impedeUso: parsed.data.impedeUso,
        },
        {
          repo: {
            findEquipamento: (equipamentoId) =>
              tx.equipamento.findUnique({
                where: { id: equipamentoId },
                select: {
                  id: true,
                  status: true,
                  estadoConservacao: true,
                },
              }),
            findActiveEmprestimoItem: async (equipamentoId) => {
              const item = await tx.emprestimoItem.findFirst({
                where: {
                  equipamentoId,
                  devolvidoEm: null,
                  emprestimo: { encerradoEm: null },
                },
                select: {
                  id: true,
                  emprestimoId: true,
                  emprestimo: { select: { responsavelId: true } },
                },
              });
              if (!item) return null;
              return {
                id: item.id,
                emprestimoId: item.emprestimoId,
                responsavelId: item.emprestimo.responsavelId,
              };
            },
            findResponsavelExists: async (responsavelId) => {
              const found = await tx.responsavel.findUnique({
                where: { id: responsavelId },
                select: { id: true },
              });
              return found !== null;
            },
            createOcorrencia: (data) =>
              tx.ocorrencia.create({
                data,
              }),
            marcarEmprestimoItemEncerrado: async (
              emprestimoItemId,
              devolvidoEm,
              condicaoDevolucao
            ) => {
              await tx.emprestimoItem.update({
                where: { id: emprestimoItemId },
                data: { devolvidoEm, condicaoDevolucao },
              });
            },
            countItensPendentesEmprestimo: (emprestimoId) =>
              tx.emprestimoItem.count({
                where: { emprestimoId, devolvidoEm: null },
              }),
            encerrarEmprestimo: async (emprestimoId, encerradoEm) => {
              await tx.emprestimo.update({
                where: { id: emprestimoId },
                data: { encerradoEm },
              });
            },
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
          },
        }
      );
    });

    logger.info("ocorrencia.created", {
      ocorrenciaId: result.ocorrencia.id,
      equipamentoId: result.ocorrencia.equipamentoId,
      tipo: result.ocorrencia.tipo,
      statusDestino: result.statusDestino,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (err) {
    if (err instanceof OcorrenciaError) {
      return NextResponse.json(
        { ok: false, message: err.message },
        { status: err.httpStatus }
      );
    }

    logger.error("ocorrencia.create.error", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, message: "Erro interno ao registrar ocorrência." },
      { status: 500 }
    );
  }
}
