import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  buildRelatorioWhere,
  gerarCsvStream,
  parseRelatorioFiltro,
} from "@/lib/relatorios";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filtro = parseRelatorioFiltro(searchParams);
  const where = buildRelatorioWhere(filtro);

  const stream = gerarCsvStream({
    batchSize: 500,
    fetchBatch: async (cursorId, take) => {
      try {
        return await prisma.movimentacao.findMany({
          where,
          orderBy: [{ ocorridoEm: "desc" }, { id: "desc" }],
          take,
          ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
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
        });
      } catch (err) {
        logger.error("relatorios.csv.batch_error", {
          reason: err instanceof Error ? err.message : "unknown",
        });
        throw err;
      }
    },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-movimentacoes-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
