"use client";

import type { MovimentacaoTipoEvento } from "@prisma/client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { TIPO_EVENTO_LABEL } from "@/lib/equipamento-labels";

interface RelatorioItemDTO {
  id: string;
  ocorridoEm: string;
  tipoEvento: MovimentacaoTipoEvento;
  tipoEventoLabel: string;
  resumoDetalhes: string;
  registradoPor: string;
  equipamento: {
    id: string;
    nome: string;
    codigoPatrimonio: string | null;
    codigoInterno: string | null;
  } | null;
  responsavel: {
    id: string;
    nome: string;
    matricula: string;
  } | null;
}

const EVENTO_OPCOES: Array<{ value: "" | MovimentacaoTipoEvento; label: string }> = [
  { value: "", label: "Todos os eventos" },
  { value: "RETIRADA", label: TIPO_EVENTO_LABEL.RETIRADA },
  { value: "DEVOLUCAO", label: TIPO_EVENTO_LABEL.DEVOLUCAO },
  { value: "OCORRENCIA", label: TIPO_EVENTO_LABEL.OCORRENCIA },
  { value: "REPOSICAO", label: TIPO_EVENTO_LABEL.REPOSICAO },
  { value: "CADASTRO", label: TIPO_EVENTO_LABEL.CADASTRO },
  {
    value: "SINCRONIZACAO_PLANILHA",
    label: TIPO_EVENTO_LABEL.SINCRONIZACAO_PLANILHA,
  },
];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function RelatoriosView() {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [tipoEvento, setTipoEvento] = useState<"" | MovimentacaoTipoEvento>("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const [appliedFilters, setAppliedFilters] = useState({
    dataInicio: "",
    dataFim: "",
    tipoEvento: "" as "" | MovimentacaoTipoEvento,
    q: "",
  });

  const [items, setItems] = useState<RelatorioItemDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const buildQueryString = useCallback(
    (includePagination: boolean) => {
      const params = new URLSearchParams();
      if (appliedFilters.dataInicio) {
        params.set("dataInicio", appliedFilters.dataInicio);
      }
      if (appliedFilters.dataFim) {
        params.set("dataFim", appliedFilters.dataFim);
      }
      if (appliedFilters.tipoEvento) {
        params.set("tipoEvento", appliedFilters.tipoEvento);
      }
      if (appliedFilters.q) {
        params.set("q", appliedFilters.q);
      }
      if (includePagination) {
        params.set("page", String(page));
        params.set("pageSize", "20");
      }
      return params.toString();
    },
    [appliedFilters, page]
  );

  const csvHref = useMemo(() => {
    const qs = buildQueryString(false);
    return qs ? `/api/relatorios/csv?${qs}` : "/api/relatorios/csv";
  }, [buildQueryString]);

  const carregar = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setErrorMsg(null);
      let aborted = false;
      try {
        const qs = buildQueryString(true);
        const res = await fetch(`/api/relatorios?${qs}`, {
          cache: "no-store",
          signal,
        });
        const data = (await res.json()) as {
          ok?: boolean;
          message?: string;
          items?: RelatorioItemDTO[];
          total?: number;
          totalPages?: number;
        };
        if (!res.ok || !data.ok) {
          setErrorMsg(data.message ?? "Erro ao carregar relatórios.");
          return;
        }
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          aborted = true;
          return;
        }
        setErrorMsg("Falha de comunicação ao carregar relatórios.");
      } finally {
        if (!aborted) {
          setLoading(false);
        }
      }
    },
    [buildQueryString]
  );

  useEffect(() => {
    const controller = new AbortController();
    void carregar(controller.signal);
    return () => controller.abort();
  }, [carregar]);

  function handleFiltrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(1);
    setAppliedFilters({
      dataInicio,
      dataFim,
      tipoEvento,
      q: q.trim(),
    });
  }

  function handleLimpar() {
    setDataInicio("");
    setDataFim("");
    setTipoEvento("");
    setQ("");
    setPage(1);
    setAppliedFilters({ dataInicio: "", dataFim: "", tipoEvento: "", q: "" });
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleFiltrar}
        className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="rel-inicio"
              className="block text-xs font-semibold text-neutral-700"
            >
              Data inicial
            </label>
            <input
              id="rel-inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="rel-fim"
              className="block text-xs font-semibold text-neutral-700"
            >
              Data final
            </label>
            <input
              id="rel-fim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="rel-evento"
              className="block text-xs font-semibold text-neutral-700"
            >
              Tipo de evento
            </label>
            <select
              id="rel-evento"
              value={tipoEvento}
              onChange={(e) =>
                setTipoEvento(e.target.value as "" | MovimentacaoTipoEvento)
              }
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none"
            >
              {EVENTO_OPCOES.map((op) => (
                <option key={op.value || "ALL"} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="rel-busca"
              className="block text-xs font-semibold text-neutral-700"
            >
              Equipamento ou responsável
            </label>
            <input
              id="rel-busca"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome, matrícula ou código..."
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Aplicar filtros
            </button>
            <button
              type="button"
              onClick={handleLimpar}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Limpar
            </button>
          </div>

          <a
            href={csvHref}
            download
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Exportar CSV ({total} {total === 1 ? "registro" : "registros"})
          </a>
        </div>
      </form>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {errorMsg}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Carregando movimentações...</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-600">
          Nenhuma movimentação encontrada para os filtros selecionados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase text-neutral-600">
              <tr>
                <th className="px-4 py-3">Data/Hora</th>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Equipamento</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {items.map((mov) => {
                const codigo =
                  mov.equipamento?.codigoPatrimonio ??
                  mov.equipamento?.codigoInterno ??
                  "—";
                return (
                  <tr key={mov.id} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-600">
                      {formatDateTime(mov.ocorridoEm)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-neutral-900">
                      {mov.tipoEventoLabel}
                    </td>
                    <td className="px-4 py-3">
                      {mov.equipamento ? (
                        <Link
                          href={`/equipamentos/${mov.equipamento.id}`}
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          {mov.equipamento.nome} ({codigo})
                        </Link>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      {mov.responsavel
                        ? `${mov.responsavel.nome} (${mov.responsavel.matricula})`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600">
                      {mov.resumoDetalhes}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-neutral-600">
          <span>
            Página {page} de {totalPages} ({total}{" "}
            {total === 1 ? "registro" : "registros"})
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
