import type { EquipamentoStatus } from "@prisma/client";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { formatarCodigoEquipamento } from "@/lib/codigo-interno";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<
  EquipamentoStatus,
  { label: string; className: string }
> = {
  DISPONIVEL: {
    label: "Disponível",
    className: "bg-emerald-50 text-emerald-800",
  },
  EMPRESTADO: {
    label: "Emprestado",
    className: "bg-blue-50 text-blue-800",
  },
  EM_MANUTENCAO: {
    label: "Em manutenção",
    className: "bg-amber-50 text-amber-900",
  },
  EXTRAVIADO: {
    label: "Extraviado",
    className: "bg-red-50 text-red-800",
  },
};

export default async function EquipamentosPage() {
  const equipamentos = await prisma.equipamento.findMany({
    orderBy: { criadoEm: "desc" },
    include: {
      categoria: { select: { nome: true } },
      equipamentoPrincipal: {
        select: { nome: true, codigoInterno: true, codigoPatrimonio: true },
      },
    },
  });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-xs font-medium text-neutral-500 hover:text-neutral-800"
          >
            ← Início
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
            Equipamentos
          </h1>
          <p className="text-sm text-neutral-600">
            Itens cadastrados no inventário da Coordenação.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/equipamentos/novo"
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Novo item +
          </Link>
          <div className="[&>button]:mt-0">
            <LogoutButton />
          </div>
        </div>
      </header>

      {equipamentos.length === 0 ? (
        <section className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <p className="text-sm text-neutral-600">
            Nenhum equipamento cadastrado ainda.
          </p>
          <Link
            href="/equipamentos/novo"
            className="mt-4 inline-block rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Cadastrar primeiro item
          </Link>
        </section>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-600 uppercase">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Equipamento</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Localização</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {equipamentos.map((item) => {
                const codigo = formatarCodigoEquipamento(item);
                const principalCode = item.equipamentoPrincipal
                  ? formatarCodigoEquipamento(item.equipamentoPrincipal)
                  : null;
                const badge = STATUS_BADGE[item.status];

                return (
                  <tr key={item.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-neutral-800">
                      {codigo}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900">{item.nome}</p>
                      {item.equipamentoPrincipal && (
                        <p className="text-xs text-neutral-500">
                          Acessório de {item.equipamentoPrincipal.nome}
                          {principalCode && principalCode !== "-"
                            ? ` (${principalCode})`
                            : ""}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      {item.categoria.nome}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      {item.localizacao}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.codigoInterno ? (
                        <Link
                          href={`/equipamentos/${item.id}/etiqueta`}
                          className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                        >
                          Imprimir etiqueta
                        </Link>
                      ) : (
                        <span className="text-xs text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
