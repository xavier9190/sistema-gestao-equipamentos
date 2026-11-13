import { NextResponse } from "next/server";
import { listarHistorico, parseHistoricoFiltro } from "@/lib/historico";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const filtro = parseHistoricoFiltro(searchParams);

  try {
    const responsavel = await prisma.responsavel.findUnique({
      where: { id },
      select: { id: true, nome: true, matricula: true },
    });

    if (!responsavel) {
      return NextResponse.json(
        { ok: false, message: "Responsável não encontrado." },
        { status: 404 }
      );
    }

    const historico = await listarHistorico(
      {
        responsavelId: id,
        tipoEvento: filtro.tipoEvento,
        page: filtro.page,
        pageSize: filtro.pageSize,
      },
      {
        repo: {
          countMovimentacoes: (q) =>
            prisma.movimentacao.count({
              where: {
                responsavelId: q.responsavelId,
                ...(q.tipoEvento ? { tipoEvento: q.tipoEvento } : {}),
              },
            }),
          findMovimentacoes: (q) =>
            prisma.movimentacao.findMany({
              where: {
                responsavelId: q.responsavelId,
                ...(q.tipoEvento ? { tipoEvento: q.tipoEvento } : {}),
              },
              orderBy: { ocorridoEm: "desc" },
              skip: q.skip,
              take: q.take,
              select: {
                id: true,
                tipoEvento: true,
                detalhes: true,
                registradoPor: true,
                ocorridoEm: true,
                equipamento: {
                  select: {
                    id: true,
                    nome: true,
                    codigoPatrimonio: true,
                    codigoInterno: true,
                  },
                },
                responsavel: {
                  select: {
                    id: true,
                    nome: true,
                    matricula: true,
                  },
                },
              },
            }),
        },
      }
    );

    return NextResponse.json({ ok: true, responsavel, ...historico });
  } catch (err) {
    logger.error("historico.responsavel.error", {
      responsavelId: id,
      reason: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, message: "Erro ao consultar histórico do responsável." },
      { status: 500 }
    );
  }
}
