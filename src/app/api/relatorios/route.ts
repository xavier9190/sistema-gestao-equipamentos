import { NextResponse } from "next/server";
import { TIPO_EVENTO_LABEL } from "@/lib/equipamento-labels";
import { formatarDetalhesMovimentacao } from "@/lib/historico";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { buildRelatorioWhere, parseRelatorioFiltro } from "@/lib/relatorios";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filtro = parseRelatorioFiltro(searchParams);
  const where = buildRelatorioWhere(filtro);
  const skip = (filtro.page - 1) * filtro.pageSize;

  try {
    const [total, rows] = await Promise.all([
      prisma.movimentacao.count({ where }),
      prisma.movimentacao.findMany({
        where,
        orderBy: [{ ocorridoEm: "desc" }, { id: "desc" }],
        skip,
        take: filtro.pageSize,
        select: {
          id: true,
          ocorridoEm: true,
          tipoEvento: true,
          registradoPor: true,
          detalhes: true,
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
    ]);

    const totalPages = Math.max(1, Math.ceil(total / filtro.pageSize));
    const items = rows.map((row) => ({
      id: row.id,
      ocorridoEm: row.ocorridoEm.toISOString(),
      tipoEvento: row.tipoEvento,
      tipoEventoLabel: TIPO_EVENTO_LABEL[row.tipoEvento],
      resumoDetalhes: formatarDetalhesMovimentacao(row.tipoEvento, row.detalhes),
      registradoPor: row.registradoPor,
      equipamento: row.equipamento,
      responsavel: row.responsavel,
    }));

    return NextResponse.json({
      ok: true,
      items,
      total,
      page: filtro.page,
      pageSize: filtro.pageSize,
      totalPages,
    });
  } catch (err) {
    logger.error("relatorios.list.error", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, message: "Erro ao consultar relatórios." },
      { status: 500 }
    );
  }
}
