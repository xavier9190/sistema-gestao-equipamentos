import { NextResponse } from "next/server";
import {
  buscarEquipamentoPorCodigo,
  EquipamentoBuscaError,
} from "@/lib/equipamento-busca";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawCodigo = searchParams.get("codigo") ?? "";

  try {
    const equipamento = await buscarEquipamentoPorCodigo(rawCodigo, {
      repo: {
        findByCodigo: async (codigo) => {
          const row = await prisma.equipamento.findFirst({
            where: {
              OR: [
                { codigoPatrimonio: { equals: codigo, mode: "insensitive" } },
                { codigoInterno: { equals: codigo, mode: "insensitive" } },
              ],
            },
            include: {
              categoria: { select: { nome: true } },
              acessorios: {
                where: { status: "DISPONIVEL", emprestavel: true },
                select: {
                  id: true,
                  nome: true,
                  codigoPatrimonio: true,
                  codigoInterno: true,
                },
              },
              emprestimoItens: {
                where: { devolvidoEm: null },
                take: 1,
                include: {
                  emprestimo: {
                    include: {
                      responsavel: {
                        select: { nome: true, matricula: true },
                      },
                    },
                  },
                },
              },
            },
          });

          if (!row) {
            return null;
          }

          const activeItem = row.emprestimoItens[0];
          return {
            id: row.id,
            nome: row.nome,
            codigoPatrimonio: row.codigoPatrimonio,
            codigoInterno: row.codigoInterno,
            categoria: row.categoria.nome,
            localizacao: row.localizacao,
            status: row.status,
            emprestavel: row.emprestavel,
            acessoriosDisponiveis: row.acessorios,
            emprestimoAtivo: activeItem
              ? {
                  emprestimoId: activeItem.emprestimo.id,
                  responsavelNome: activeItem.emprestimo.responsavel.nome,
                  responsavelMatricula:
                    activeItem.emprestimo.responsavel.matricula,
                  retiradoEm: activeItem.emprestimo.retiradoEm.toISOString(),
                  previsaoDevolucao: activeItem.emprestimo.previsaoDevolucao
                    ? activeItem.emprestimo.previsaoDevolucao.toISOString()
                    : null,
                }
              : null,
          };
        },
      },
    });

    return NextResponse.json({ ok: true, equipamento }, { status: 200 });
  } catch (err) {
    if (err instanceof EquipamentoBuscaError) {
      return NextResponse.json(
        { ok: false, message: err.message },
        { status: err.httpStatus }
      );
    }

    return NextResponse.json(
      { ok: false, message: "Erro interno ao buscar equipamento." },
      { status: 500 }
    );
  }
}
