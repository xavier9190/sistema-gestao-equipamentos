"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmprestimoStatusBadge } from "@/components/status-badges";
import type { PainelResumo } from "@/lib/painel";

type FiltroPendencia = "TODOS" | "ATRASADOS" | "EM_ABERTO";

const AUTO_REFRESH_MS = 30_000;

function formatDateTime(iso: string | null): string {
  if (!iso) return "Sem previsão";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function PainelSituacao() {
  const [resumo, setResumo] = useState<PainelResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroPendencia>("TODOS");

  const carregarPainel = useCallback(async (signal?: AbortSignal) => {
    setRefreshing(true);
    setErrorMsg(null);
    let aborted = false;
    try {
      const res = await fetch("/api/painel", {
        cache: "no-store",
        signal,
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
      } & Partial<PainelResumo>;

      if (!res.ok || !data.ok || !data.contadores || !data.pendencias) {
        setErrorMsg(data.message ?? "Erro ao carregar painel de situação.");
        return;
      }

      setResumo({
        atualizadoEm: data.atualizadoEm ?? new Date().toISOString(),
        contadores: data.contadores,
        pendencias: data.pendencias,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        aborted = true;
        return;
      }
      setErrorMsg("Falha de comunicação ao atualizar o painel.");
    } finally {
      if (!aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    let activeController = new AbortController();
    void carregarPainel(activeController.signal);

    const timer = setInterval(() => {
      activeController.abort();
      activeController = new AbortController();
      void carregarPainel(activeController.signal);
    }, AUTO_REFRESH_MS);

    return () => {
      activeController.abort();
      clearInterval(timer);
    };
  }, [carregarPainel]);

  const pendenciasFiltradas = useMemo(() => {
    if (!resumo) return [];
    switch (filtro) {
      case "ATRASADOS":
        return resumo.pendencias.filter((p) => p.status === "ATRASADO");
      case "EM_ABERTO":
        return resumo.pendencias.filter((p) => p.status === "EM_ABERTO");
      default:
        return resumo.pendencias;
    }
  }, [resumo, filtro]);

  if (loading && !resumo) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600 shadow-xs">
        Carregando painel de situação...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-xs">
        <p className="text-xs text-neutral-600">
          Última atualização:{" "}
          <span className="font-medium text-neutral-900">
            {resumo ? formatDateTime(resumo.atualizadoEm) : "—"}
          </span>{" "}
          (atualização automática a cada 30s)
        </p>
        <button
          type="button"
          disabled={refreshing}
          onClick={() => void carregarPainel()}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-60"
        >
          {refreshing ? "Atualizando..." : "Atualizar agora"}
        </button>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {errorMsg}
        </div>
      )}

      {resumo && (
        <>
          <section className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Link
              href="/equipamentos"
              className="rounded-xl border border-neutral-200 bg-white p-3 shadow-xs transition hover:border-neutral-300 sm:p-4"
            >
              <p className="text-[11px] font-medium text-neutral-500 sm:text-xs">
                Total de equipamentos
              </p>
              <p className="mt-1 text-xl font-bold text-neutral-900 sm:text-2xl">
                {resumo.contadores.totalEquipamentos}
              </p>
            </Link>

            <Link
              href="/equipamentos?status=DISPONIVEL"
              className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 shadow-xs transition hover:border-emerald-300 sm:p-4"
            >
              <p className="text-[11px] font-medium text-emerald-800 sm:text-xs">
                Disponíveis
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-900 sm:text-2xl">
                {resumo.contadores.disponiveis}
              </p>
            </Link>

            <Link
              href="/equipamentos?status=EMPRESTADO"
              className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 shadow-xs transition hover:border-blue-300 sm:p-4"
            >
              <p className="text-[11px] font-medium text-blue-800 sm:text-xs">
                Emprestados
              </p>
              <p className="mt-1 text-xl font-bold text-blue-900 sm:text-2xl">
                {resumo.contadores.emprestados}
              </p>
            </Link>

            <Link
              href="/equipamentos?status=EM_MANUTENCAO"
              className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 shadow-xs transition hover:border-amber-300 sm:p-4"
            >
              <p className="text-[11px] font-medium text-amber-800 sm:text-xs">
                Em manutenção
              </p>
              <p className="mt-1 text-xl font-bold text-amber-900 sm:text-2xl">
                {resumo.contadores.emManutencao}
              </p>
            </Link>

            <Link
              href="/equipamentos?status=EXTRAVIADO"
              className="rounded-xl border border-red-200 bg-red-50/60 p-3 shadow-xs transition hover:border-red-300 sm:p-4"
            >
              <p className="text-[11px] font-medium text-red-800 sm:text-xs">
                Extraviados
              </p>
              <p className="mt-1 text-xl font-bold text-red-900 sm:text-2xl">
                {resumo.contadores.extraviados}
              </p>
            </Link>

            <button
              type="button"
              onClick={() => setFiltro("ATRASADOS")}
              className="rounded-xl border border-red-300 bg-red-50 p-3 text-left shadow-xs transition hover:border-red-400 sm:p-4"
            >
              <p className="text-[11px] font-medium text-red-800 sm:text-xs">
                Empréstimos atrasados
              </p>
              <p className="mt-1 text-xl font-bold text-red-900 sm:text-2xl">
                {resumo.contadores.emprestimosAtrasados}
              </p>
              <p className="mt-0.5 text-[11px] text-red-700">
                {resumo.contadores.itensAtrasados}{" "}
                {resumo.contadores.itensAtrasados === 1
                  ? "item vencido"
                  : "itens vencidos"}
              </p>
            </button>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">
                  Devoluções pendentes ({resumo.contadores.emprestimosEmAberto})
                </h2>
                <p className="text-xs text-neutral-600">
                  Empréstimos vencidos aparecem primeiro para facilitar a
                  cobrança.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setFiltro("TODOS")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    filtro === "TODOS"
                      ? "bg-neutral-900 text-white"
                      : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  Todos ({resumo.contadores.emprestimosEmAberto})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltro("ATRASADOS")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    filtro === "ATRASADOS"
                      ? "bg-red-700 text-white"
                      : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  Atrasados ({resumo.contadores.emprestimosAtrasados})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltro("EM_ABERTO")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    filtro === "EM_ABERTO"
                      ? "bg-blue-700 text-white"
                      : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  Em aberto ({resumo.contadores.emprestimosNoPrazo})
                </button>
              </div>
            </div>

            {pendenciasFiltradas.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-500">
                Nenhuma devolução pendente para o filtro selecionado.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {pendenciasFiltradas.map((pend) => (
                  <li
                    key={pend.id}
                    className={`rounded-lg border p-4 ${
                      pend.status === "ATRASADO"
                        ? "border-red-200 bg-red-50/40"
                        : "border-neutral-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-neutral-900">
                            {pend.responsavel.nome}
                          </p>
                          <EmprestimoStatusBadge status={pend.status} />
                          {pend.diasAtraso > 0 && (
                            <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                              {pend.diasAtraso}{" "}
                              {pend.diasAtraso === 1 ? "dia" : "dias"} de atraso
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-neutral-600">
                          Matrícula {pend.responsavel.matricula} · Contato:{" "}
                          {pend.responsavel.contato}
                        </p>
                        <p className="mt-1 text-xs text-neutral-700">
                          Motivo: {pend.motivo}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-600">
                          Retirada: {formatDateTime(pend.retiradoEm)} · Previsão:{" "}
                          {formatDateTime(pend.previsaoDevolucao)}
                        </p>
                      </div>

                      <Link
                        href={`/devolucoes?emprestimoId=${pend.id}`}
                        className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
                      >
                        Registrar devolução
                      </Link>
                    </div>

                    <div className="mt-3 border-t border-neutral-200/70 pt-2.5">
                      <p className="text-xs font-medium text-neutral-700">
                        Itens pendentes ({pend.itensPendentes.length}):
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {pend.itensPendentes.map((item) => {
                          const codigo =
                            item.codigoPatrimonio ??
                            item.codigoInterno ??
                            "Sem código";
                          return (
                            <Link
                              key={item.id}
                              href={`/equipamentos/${item.equipamentoId}`}
                              className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-800 hover:border-emerald-600 hover:text-emerald-800"
                            >
                              {item.nome} ({codigo})
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
