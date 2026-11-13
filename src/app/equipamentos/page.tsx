import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { formatarCodigoEquipamento } from "@/lib/codigo-interno";
import {
  buildEquipamentoWhere,
  parseEquipamentoFiltros,
} from "@/lib/equipamento-filtro";
import { STATUS_EQUIPAMENTO_UI } from "@/lib/equipamento-labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EquipamentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const filtros = parseEquipamentoFiltros(rawParams);
  const hasActiveFilters = Boolean(
    filtros.q ||
      filtros.categoriaId ||
      filtros.status ||
      filtros.localizacao ||
      filtros.emprestavel !== undefined
  );

  const [equipamentos, categorias] = await Promise.all([
    prisma.equipamento.findMany({
      where: buildEquipamentoWhere(filtros),
      orderBy: { criadoEm: "desc" },
      include: {
        categoria: { select: { nome: true } },
        equipamentoPrincipal: {
          select: { id: true, nome: true, codigoInterno: true, codigoPatrimonio: true },
        },
      },
    }),
    prisma.categoria.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  return (
    <main className="mx-auto max-w-6xl p-6">
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
            {equipamentos.length}{" "}
            {equipamentos.length === 1
              ? "equipamento encontrado"
              : "equipamentos encontrados"}
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

      <form
        method="GET"
        action="/equipamentos"
        className="mb-6 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6"
      >
        <div className="lg:col-span-2">
          <label
            htmlFor="q"
            className="block text-xs font-medium text-neutral-600"
          >
            Buscar por nome ou código
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={filtros.q ?? ""}
            placeholder="Ex: Notebook, PAT 0001, INT-0001"
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="categoriaId"
            className="block text-xs font-medium text-neutral-600"
          >
            Categoria
          </label>
          <select
            id="categoriaId"
            name="categoriaId"
            defaultValue={filtros.categoriaId ?? ""}
            className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:border-emerald-600 focus:outline-none"
          >
            <option value="">Todas</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="status"
            className="block text-xs font-medium text-neutral-600"
          >
            Situação
          </label>
          <select
            id="status"
            name="status"
            defaultValue={filtros.status ?? ""}
            className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:border-emerald-600 focus:outline-none"
          >
            <option value="">Todas</option>
            <option value="DISPONIVEL">Disponível</option>
            <option value="EMPRESTADO">Emprestado</option>
            <option value="EM_MANUTENCAO">Em manutenção</option>
            <option value="EXTRAVIADO">Extraviado</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="localizacao"
            className="block text-xs font-medium text-neutral-600"
          >
            Localização
          </label>
          <input
            id="localizacao"
            name="localizacao"
            type="text"
            defaultValue={filtros.localizacao ?? ""}
            placeholder="Ex: Coordenação"
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="emprestavel"
            className="block text-xs font-medium text-neutral-600"
          >
            Emprestável
          </label>
          <select
            id="emprestavel"
            name="emprestavel"
            defaultValue={
              filtros.emprestavel === undefined
                ? ""
                : String(filtros.emprestavel)
            }
            className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:border-emerald-600 focus:outline-none"
          >
            <option value="">Todos</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 sm:col-span-2 lg:col-span-6">
          {hasActiveFilters && (
            <Link
              href="/equipamentos"
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Limpar filtros
            </Link>
          )}
          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-neutral-800"
          >
            Filtrar
          </button>
        </div>
      </form>

      {equipamentos.length === 0 ? (
        <section className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <p className="text-sm text-neutral-600">
            {hasActiveFilters
              ? "Nenhum equipamento encontrado com os filtros aplicados."
              : "Nenhum equipamento cadastrado ainda."}
          </p>
          {hasActiveFilters ? (
            <Link
              href="/equipamentos"
              className="mt-4 inline-block rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Limpar filtros
            </Link>
          ) : (
            <Link
              href="/equipamentos/novo"
              className="mt-4 inline-block rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Cadastrar primeiro item
            </Link>
          )}
        </section>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-600 uppercase">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Equipamento</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Localização</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {equipamentos.map((item) => {
                const codigo = formatarCodigoEquipamento(item);
                const principalCode = item.equipamentoPrincipal
                  ? formatarCodigoEquipamento(item.equipamentoPrincipal)
                  : null;
                const badge = STATUS_EQUIPAMENTO_UI[item.status];

                return (
                  <tr key={item.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-neutral-800">
                      <Link
                        href={`/equipamentos/${item.id}`}
                        className="hover:text-emerald-700 hover:underline"
                      >
                        {codigo}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/equipamentos/${item.id}`}
                        className="font-medium text-neutral-900 hover:text-emerald-700 hover:underline"
                      >
                        {item.nome}
                      </Link>
                      {!item.emprestavel && (
                        <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600">
                          Não emprestável
                        </span>
                      )}
                      {item.equipamentoPrincipal && (
                        <p className="text-xs text-neutral-500">
                          Acessório de{" "}
                          <Link
                            href={`/equipamentos/${item.equipamentoPrincipal.id}`}
                            className="hover:underline"
                          >
                            {item.equipamentoPrincipal.nome}
                            {principalCode && principalCode !== "-"
                              ? ` (${principalCode})`
                              : ""}
                          </Link>
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
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/equipamentos/${item.id}`}
                          className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                        >
                          Ficha
                        </Link>
                        {item.codigoInterno && (
                          <Link
                            href={`/equipamentos/${item.id}/etiqueta`}
                            className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                          >
                            Imprimir etiqueta
                          </Link>
                        )}
                      </div>
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
