import { NextResponse } from "next/server";
import { calcularStatusEmprestimo } from "@/lib/emprestimo-status";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const emprestimoId = searchParams.get("emprestimoId")?.trim() ?? "";

  try {
    const now = new Date();
    const emprestimos = await prisma.emprestimo.findMany({
      where: {
        encerradoEm: null,
        ...(emprestimoId ? { id: emprestimoId } : {}),
        ...(q
          ? {
              OR: [
                { responsavel: { nome: { contains: q, mode: "insensitive" } } },
                {
                  responsavel: {
                    matricula: { contains: q, mode: "insensitive" },
                  },
                },
                {
                  itens: {
                    some: {
                      equipamento: {
                        OR: [
                          {
                            codigoPatrimonio: {
                              contains: q,
                              mode: "insensitive",
                            },
                          },
                          {
                            codigoInterno: {
                              contains: q,
                              mode: "insensitive",
                            },
                          },
                          {
                            nome: { contains: q, mode: "insensitive" },
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { retiradoEm: "desc" },
      take: 20,
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
          },
        },
        itens: {
          orderBy: { equipamento: { nome: "asc" } },
          select: {
            id: true,
            equipamentoId: true,
            devolvidoEm: true,
            condicaoDevolucao: true,
            equipamento: {
              select: {
                id: true,
                codigoPatrimonio: true,
                codigoInterno: true,
                nome: true,
                status: true,
              },
            },
          },
        },
      },
    });

    const data = emprestimos.map((emp) => ({
      ...emp,
      status: calcularStatusEmprestimo(emp, now),
    }));

    return NextResponse.json({ ok: true, emprestimos: data });
  } catch (err) {
    logger.error("emprestimos.abertos.error", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, message: "Erro ao buscar empréstimos em aberto." },
      { status: 500 }
    );
  }
}
