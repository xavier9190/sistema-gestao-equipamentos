import type { EquipamentoStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { obterResumoPainel } from "@/lib/painel";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const resumo = await obterResumoPainel({
      repo: {
        countEquipamentosByStatus: async () => {
          const grouped = await prisma.equipamento.groupBy({
            by: ["status"],
            _count: { _all: true },
          });
          const counts: Partial<Record<EquipamentoStatus, number>> = {};
          for (const row of grouped) {
            counts[row.status] = row._count._all;
          }
          return counts;
        },
        findEmprestimosAbertos: () =>
          prisma.emprestimo.findMany({
            where: { encerradoEm: null },
            select: {
              id: true,
              motivo: true,
              retiradoEm: true,
              previsaoDevolucao: true,
              encerradoEm: true,
              responsavel: {
                select: {
                  id: true,
                  nome: true,
                  matricula: true,
                  tipo: true,
                  contato: true,
                },
              },
              itens: {
                where: { devolvidoEm: null },
                orderBy: { equipamento: { nome: "asc" } },
                select: {
                  id: true,
                  equipamentoId: true,
                  devolvidoEm: true,
                  equipamento: {
                    select: {
                      id: true,
                      nome: true,
                      codigoPatrimonio: true,
                      codigoInterno: true,
                    },
                  },
                },
              },
            },
          }),
      },
    });

    return NextResponse.json({ ok: true, ...resumo });
  } catch (err) {
    logger.error("painel.get.error", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, message: "Erro ao carregar painel de situação." },
      { status: 500 }
    );
  }
}
