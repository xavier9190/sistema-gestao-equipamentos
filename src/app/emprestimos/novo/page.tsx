import Link from "next/link";
import { NovoEmprestimoForm } from "@/components/novo-emprestimo-form";
import type { EquipamentoBuscaRecord } from "@/lib/equipamento-busca";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NovoEmprestimoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawId = Array.isArray(params.equipamentoId)
    ? params.equipamentoId[0]
    : params.equipamentoId;

  let initialEquipamento: EquipamentoBuscaRecord | null = null;
  if (rawId) {
    const row = await prisma.equipamento.findUnique({
      where: { id: rawId },
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
      },
    });

    if (row) {
      initialEquipamento = {
        id: row.id,
        nome: row.nome,
        codigoPatrimonio: row.codigoPatrimonio,
        codigoInterno: row.codigoInterno,
        categoria: row.categoria.nome,
        localizacao: row.localizacao,
        status: row.status,
        emprestavel: row.emprestavel,
        acessoriosDisponiveis: row.acessorios,
        emprestimoAtivo: null,
      };
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-xs font-medium text-neutral-500 hover:text-neutral-800"
          >
            ← Início
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
            Novo empréstimo
          </h1>
          <p className="text-sm text-neutral-600">
            Registre a retirada de equipamentos e acessórios vinculados no
            balcão.
          </p>
        </div>

        <Link
          href="/ler-codigo"
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Ler código
        </Link>
      </header>

      <NovoEmprestimoForm initialEquipamento={initialEquipamento} />
    </main>
  );
}
