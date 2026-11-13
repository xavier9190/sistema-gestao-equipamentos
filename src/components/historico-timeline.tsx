"use client";

import type { MovimentacaoTipoEvento } from "@prisma/client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TIPO_EVENTO_LABEL } from "@/lib/equipamento-labels";
import type { HistoricoItemDTO } from "@/lib/historico";

interface HistoricoTimelineProps {
  mode: "equipamento" | "responsavel";
  entityId: string;
  title?: string;
}

const EVENTO_OPCOES: Array<{ value: "" | MovimentacaoTipoEvento; label: string }> = [
  { value: "", label: "Todos os eventos" },
  { value: "RETIRADA", label: TIPO_EVENTO_LABEL.RETIRADA },
  { value: "DEVOLUCAO", label: TIPO_EVENTO_LABEL.DEVOLUCAO },
  { value: "CADASTRO", label: TIPO_EVENTO_LABEL.CADASTRO },
  {
    value: "SINCRONIZACAO_PLANILHA",
    label: TIPO_EVENTO_LABEL.SINCRONIZACAO_PLANILHA,
  },
  { value: "OCORRENCIA", label: TIPO_EVENTO_LABEL.OCORRENCIA },
  { value: "REPOSICAO", label: TIPO_EVENTO_LABEL.REPOSICAO },
];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function HistoricoTimeline({
  mode,
  entityId,
  title = "Linha do tempo (histórico imutável)",
}: HistoricoTimelineProps) {
  const [tipoEvento, setTipoEvento] = useState<"" | MovimentacaoTipoEvento>("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<HistoricoItemDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const endpointBase =
    mode === "equipamento"
      ? `/api/equipamentos/${entityId}/historico`
      : `/api/responsaveis/${entityId}/historico`;

  const carregar = useCallback(
    async (
      nextPage: number,
      nextTipo: "" | MovimentacaoTipoEvento,
      signal?: AbortSignal
    ) => {
      setLoading(true);
      setErrorMsg(null);
      let aborted = false;
      try {
        const params = new URLSearchParams();
        params.set("page", String(nextPage));
        params.set("pageSize", "10");
        if (nextTipo) params.set("tipoEvento", nextTipo);

        const res = await fetch(`${endpointBase}?${params.toString()}`, {
          cache: "no-store",
          signal,
        });
        const data = (await res.json()) as {
          ok?: boolean;
          message?: string;
          items?: HistoricoItemDTO[];
          total?: number;
          totalPages?: number;
        };

        if (!res.ok || !data.ok) {
          setErrorMsg(data.message ?? "Erro ao carregar histórico.");
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
        setErrorMsg("Falha de comunicação ao carregar histórico.");
      } finally {
        if (!aborted) {
          setLoading(false);
        }
      }
    },
    [endpointBase]
  );

  useEffect(() => {
    const controller = new AbortController();
    void carregar(page, tipoEvento, controller.signal);
    return () => controller.abort();
  }, [carregar, page, tipoEvento]);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase text-neutral-900">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Registro somente-leitura ({total}{" "}
            {total === 1 ? "movimentação" : "movimentações"})
          </p>
        </div>

        <select
          aria-label="Filtrar por tipo de evento"
          value={tipoEvento}
          onChange={(e) => {
            setTipoEvento(e.target.value as "" | MovimentacaoTipoEvento);
            setPage(1);
          }}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 focus:border-emerald-600 focus:outline-none"
        >
          {EVENTO_OPCOES.map((op) => (
            <option key={op.value || "ALL"} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
        >
          {errorMsg}
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-neutral-500">Carregando histórico...</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-600">
          Nenhuma movimentação registrada.
        </p>
      ) : (
        <ol className="mt-4 space-y-3 border-l-2 border-neutral-200 pl-4">
          {items.map((mov) => (
            <li key={mov.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-600 ring-4 ring-white" />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-neutral-900">
                  {mov.tipoEventoLabel}
                </span>
                <span className="text-xs text-neutral-500">
                  {formatDateTime(mov.ocorridoEm)}
                </span>
              </div>

              <p className="mt-0.5 text-xs text-neutral-700">
                {mov.resumoDetalhes}
              </p>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <span>Registrado por {mov.registradoPor}</span>
                {mode === "equipamento" && mov.responsavel && (
                  <span>
                    · Responsável: {mov.responsavel.nome} (
                    {mov.responsavel.matricula})
                  </span>
                )}
                {mode === "responsavel" && mov.equipamento && (
                  <span>
                    · Equipamento:{" "}
                    <Link
                      href={`/equipamentos/${mov.equipamento.id}`}
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {mov.equipamento.nome} (
                      {mov.equipamento.codigoPatrimonio ??
                        mov.equipamento.codigoInterno ??
                        "Sem código"}
                      )
                    </Link>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3 text-xs text-neutral-600">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-neutral-300 px-2.5 py-1 font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-md border border-neutral-300 px-2.5 py-1 font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
