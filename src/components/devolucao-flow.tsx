"use client";

import type { CondicaoDevolucao } from "@prisma/client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LeitorCodigo } from "@/components/leitor-codigo";
import type { EquipamentoBuscaRecord } from "@/lib/equipamento-busca";
import type { StatusEmprestimoDerivado } from "@/lib/emprestimo-status";

export interface EmprestimoAbertoItem {
  id: string;
  equipamentoId: string;
  devolvidoEm: string | null;
  condicaoDevolucao: CondicaoDevolucao | null;
  equipamento: {
    id: string;
    codigoPatrimonio: string | null;
    codigoInterno: string | null;
    nome: string;
    status: string;
  };
}

export interface EmprestimoAbertoRecord {
  id: string;
  motivo: string;
  retiradoEm: string;
  previsaoDevolucao: string | null;
  encerradoEm: string | null;
  status: StatusEmprestimoDerivado;
  responsavel: {
    id: string;
    nome: string;
    matricula: string;
    tipo: string;
  };
  itens: EmprestimoAbertoItem[];
}

interface DevolucaoResultado {
  emprestimoId: string;
  encerrado: boolean;
  parcial: boolean;
  itensDevolvidosCount: number;
  itensRestantesCount: number;
  itensComProblema: Array<{
    equipamentoId: string;
    condicaoDevolucao: CondicaoDevolucao;
  }>;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function codigoEquipamento(eq: EmprestimoAbertoItem["equipamento"]): string {
  return eq.codigoPatrimonio ?? eq.codigoInterno ?? "Sem código";
}

function labelCondicao(condicao: CondicaoDevolucao): string {
  switch (condicao) {
    case "BOM_ESTADO":
      return "Bom estado";
    case "COM_DEFEITO":
      return "Com defeito";
    case "DANIFICADO":
      return "Danificado";
  }
}

export function DevolucaoFlow({
  initialEmprestimoId,
}: {
  initialEmprestimoId?: string;
}) {
  const [query, setQuery] = useState("");
  const [emprestimos, setEmprestimos] = useState<EmprestimoAbertoRecord[]>([]);
  const [loadingLista, setLoadingLista] = useState(true);
  const [selectedEmprestimo, setSelectedEmprestimo] =
    useState<EmprestimoAbertoRecord | null>(null);

  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, boolean>>(
    {}
  );
  const [condicoes, setCondicoes] = useState<Record<string, CondicaoDevolucao>>(
    {}
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [resultado, setResultado] = useState<DevolucaoResultado | null>(null);

  const inicializarSelecao = useCallback(
    (emp: EmprestimoAbertoRecord, preCheckEquipamentoId?: string) => {
      const nextSelected: Record<string, boolean> = {};
      const nextCondicoes: Record<string, CondicaoDevolucao> = {};

      for (const item of emp.itens) {
        if (item.devolvidoEm === null) {
          nextSelected[item.id] = preCheckEquipamentoId
            ? item.equipamentoId === preCheckEquipamentoId
            : false;
          nextCondicoes[item.id] = "BOM_ESTADO";
        }
      }

      setSelectedItemIds(nextSelected);
      setCondicoes(nextCondicoes);
    },
    []
  );

  const fetchEmprestimosAbertos = useCallback(
    async (opts?: { q?: string; emprestimoId?: string }) => {
      setLoadingLista(true);
      try {
        const params = new URLSearchParams();
        if (opts?.q) params.set("q", opts.q);
        if (opts?.emprestimoId) params.set("emprestimoId", opts.emprestimoId);

        const res = await fetch(`/api/emprestimos/abertos?${params.toString()}`);
        const data = (await res.json()) as {
          ok?: boolean;
          emprestimos?: EmprestimoAbertoRecord[];
          message?: string;
        };

        if (!res.ok || !data.ok) {
          setErrorMsg(data.message ?? "Erro ao buscar empréstimos em aberto.");
          return [];
        }

        const lista = data.emprestimos ?? [];
        if (!opts?.emprestimoId) {
          setEmprestimos(lista);
        }
        return lista;
      } catch {
        setErrorMsg("Falha de comunicação ao buscar empréstimos em aberto.");
        return [];
      } finally {
        setLoadingLista(false);
      }
    },
    []
  );

  useEffect(() => {
    void (async () => {
      const lista = await fetchEmprestimosAbertos();
      if (initialEmprestimoId) {
        const match =
          lista.find((e) => e.id === initialEmprestimoId) ??
          (await fetchEmprestimosAbertos({ emprestimoId: initialEmprestimoId }))[0];
        if (match) {
          setSelectedEmprestimo(match);
          inicializarSelecao(match);
        } else {
          setInfoMsg("O empréstimo informado já foi encerrado ou não existe.");
        }
      }
    })();
  }, [fetchEmprestimosAbertos, initialEmprestimoId, inicializarSelecao]);

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    await fetchEmprestimosAbertos({ q: query.trim() });
  };

  const handleEquipamentoLido = async (eq: EquipamentoBuscaRecord) => {
    setErrorMsg(null);
    setInfoMsg(null);
    setResultado(null);

    if (!eq.emprestimoAtivo) {
      setInfoMsg(
        `O equipamento "${eq.nome}" não possui empréstimo em aberto no momento.`
      );
      return;
    }

    const emprestimoId = eq.emprestimoAtivo.emprestimoId;
    if (selectedEmprestimo && selectedEmprestimo.id === emprestimoId) {
      const matchingItem = selectedEmprestimo.itens.find(
        (i) => i.equipamentoId === eq.id && i.devolvidoEm === null
      );
      if (matchingItem) {
        setSelectedItemIds((prev) => ({ ...prev, [matchingItem.id]: true }));
        setInfoMsg(`Item "${eq.nome}" marcado para devolução.`);
      }
      return;
    }

    const found = await fetchEmprestimosAbertos({ emprestimoId });
    const emp = found[0];
    if (!emp) {
      setInfoMsg("Não foi possível carregar o empréstimo ativo deste item.");
      return;
    }

    setSelectedEmprestimo(emp);
    inicializarSelecao(emp, eq.id);
    setInfoMsg(
      `Empréstimo de ${emp.responsavel.nome} carregado com "${eq.nome}" marcado.`
    );
  };

  const pendentes = useMemo(
    () =>
      selectedEmprestimo
        ? selectedEmprestimo.itens.filter((i) => i.devolvidoEm === null)
        : [],
    [selectedEmprestimo]
  );

  const selectedCount = useMemo(
    () => pendentes.filter((i) => selectedItemIds[i.id]).length,
    [pendentes, selectedItemIds]
  );

  const handleSelectAllPendentes = () => {
    const next: Record<string, boolean> = {};
    for (const item of pendentes) {
      next[item.id] = true;
    }
    setSelectedItemIds(next);
  };

  const handleSubmitDevolucao = async () => {
    if (!selectedEmprestimo) return;
    setErrorMsg(null);
    setInfoMsg(null);
    setResultado(null);

    const itens = pendentes
      .filter((i) => selectedItemIds[i.id])
      .map((i) => ({
        emprestimoItemId: i.id,
        condicaoDevolucao: condicoes[i.id] ?? "BOM_ESTADO",
      }));

    if (itens.length === 0) {
      setErrorMsg("Selecione pelo menos um item para registrar a devolução.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/devolucoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emprestimoId: selectedEmprestimo.id,
          itens,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
      } & Partial<DevolucaoResultado>;

      if (!res.ok || !data.ok) {
        setErrorMsg(data.message ?? "Erro ao registrar devolução.");
        return;
      }

      setResultado({
        emprestimoId: data.emprestimoId ?? selectedEmprestimo.id,
        encerrado: Boolean(data.encerrado),
        parcial: Boolean(data.parcial),
        itensDevolvidosCount: data.itensDevolvidosCount ?? itens.length,
        itensRestantesCount: data.itensRestantesCount ?? 0,
        itensComProblema: data.itensComProblema ?? [],
      });

      await fetchEmprestimosAbertos({ q: query.trim() });

      if (data.encerrado) {
        setSelectedEmprestimo(null);
        setSelectedItemIds({});
        setCondicoes({});
      } else {
        const refreshed = await fetchEmprestimosAbertos({
          emprestimoId: selectedEmprestimo.id,
        });
        if (refreshed[0]) {
          setSelectedEmprestimo(refreshed[0]);
          inicializarSelecao(refreshed[0]);
        }
      }
    } catch {
      setErrorMsg("Falha de comunicação ao registrar devolução.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-semibold text-neutral-900">
          1. Ler código do item ou buscar empréstimo em aberto
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Leia o código de barras/patrimônio de um equipamento emprestado ou
          busque por responsável, matrícula ou código.
        </p>

        <div className="mt-4">
          <LeitorCodigo onEquipamentoEncontrado={handleEquipamentoLido} />
        </div>

        <form onSubmit={handleBuscar} className="mt-4 flex flex-wrap gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome do responsável, matrícula, item ou código..."
            className="min-w-[240px] flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loadingLista}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
          >
            {loadingLista ? "Buscando..." : "Buscar"}
          </button>
        </form>
      </section>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {errorMsg}
        </div>
      )}

      {infoMsg && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {infoMsg}
        </div>
      )}

      {resultado && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">
            {resultado.encerrado
              ? `Devolução concluída (${resultado.itensDevolvidosCount} ${
                  resultado.itensDevolvidosCount === 1 ? "item" : "itens"
                }). Empréstimo encerrado.`
              : `Devolução parcial registrada (${resultado.itensDevolvidosCount} ${
                  resultado.itensDevolvidosCount === 1 ? "item" : "itens"
                }). Ainda restam ${resultado.itensRestantesCount} ${
                  resultado.itensRestantesCount === 1 ? "item" : "itens"
                } pendentes neste empréstimo.`}
          </p>
          {resultado.itensComProblema.length > 0 && (
            <div className="mt-2 space-y-1 text-amber-900">
              <p className="font-medium">
                Itens encaminhados para Em manutenção (
                {resultado.itensComProblema.length}):
              </p>
              <ul className="list-disc pl-5">
                {resultado.itensComProblema.map((item) => (
                  <li key={item.equipamentoId}>
                    Condição: {labelCondicao(item.condicaoDevolucao)} —{" "}
                    <Link
                      href={`/equipamentos/${item.equipamentoId}`}
                      className="font-semibold underline hover:text-amber-950"
                    >
                      Abrir ficha do equipamento
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs lg:col-span-2">
          <h2 className="text-base font-semibold text-neutral-900">
            Empréstimos em aberto ({emprestimos.length})
          </h2>

          {loadingLista ? (
            <p className="mt-4 text-sm text-neutral-500">
              Carregando empréstimos em aberto...
            </p>
          ) : emprestimos.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">
              Nenhum empréstimo em aberto encontrado.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {emprestimos.map((emp) => {
                const isSelected = selectedEmprestimo?.id === emp.id;
                const pendentesCount = emp.itens.filter(
                  (i) => i.devolvidoEm === null
                ).length;

                return (
                  <li key={emp.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setInfoMsg(null);
                        setResultado(null);
                        setSelectedEmprestimo(emp);
                        inicializarSelecao(emp);
                      }}
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/70"
                          : "border-neutral-200 bg-white hover:bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-neutral-900">
                            {emp.responsavel.nome}
                          </p>
                          <p className="text-xs text-neutral-600">
                            Matrícula {emp.responsavel.matricula}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            emp.status === "ATRASADO"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {emp.status === "ATRASADO" ? "Atrasado" : "Em aberto"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-neutral-600">
                        Retirada: {formatDateTime(emp.retiradoEm)} ·{" "}
                        {pendentesCount}{" "}
                        {pendentesCount === 1
                          ? "item pendente"
                          : "itens pendentes"}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-neutral-900">
              2. Conferência de devolução
            </h2>
            {selectedEmprestimo && pendentes.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllPendentes}
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                Selecionar todos pendentes ({pendentes.length})
              </button>
            )}
          </div>

          {!selectedEmprestimo ? (
            <p className="mt-4 text-sm text-neutral-500">
              Selecione um empréstimo na lista ao lado ou leia o código de um
              equipamento para iniciar a conferência.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-neutral-900">
                    {selectedEmprestimo.responsavel.nome} (
                    {selectedEmprestimo.responsavel.matricula})
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      selectedEmprestimo.status === "ATRASADO"
                        ? "bg-red-100 text-red-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {selectedEmprestimo.status === "ATRASADO"
                      ? "Atrasado"
                      : "Em aberto"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-600">
                  Motivo: {selectedEmprestimo.motivo}
                </p>
                <p className="mt-1 text-xs text-neutral-600">
                  Retirada: {formatDateTime(selectedEmprestimo.retiradoEm)} ·
                  Previsão:{" "}
                  {formatDateTime(selectedEmprestimo.previsaoDevolucao)}
                </p>
              </div>

              <ul className="space-y-3">
                {selectedEmprestimo.itens.map((item) => {
                  const jaDevolvido = item.devolvidoEm !== null;
                  const checked = Boolean(selectedItemIds[item.id]);
                  const condicao = condicoes[item.id] ?? "BOM_ESTADO";

                  return (
                    <li
                      key={item.id}
                      className={`rounded-lg border p-3 ${
                        jaDevolvido
                          ? "border-neutral-200 bg-neutral-50 opacity-75"
                          : checked
                            ? "border-emerald-600 bg-emerald-50/40"
                            : "border-neutral-200 bg-white"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <label className="flex cursor-pointer items-start gap-2.5">
                          <input
                            type="checkbox"
                            disabled={jaDevolvido}
                            checked={jaDevolvido ? true : checked}
                            onChange={(e) =>
                              setSelectedItemIds((prev) => ({
                                ...prev,
                                [item.id]: e.target.checked,
                              }))
                            }
                            className="mt-1 h-4 w-4 rounded border-neutral-300 text-emerald-700 focus:ring-emerald-600"
                          />
                          <div>
                            <p className="text-sm font-semibold text-neutral-900">
                              {item.equipamento.nome}
                            </p>
                            <p className="text-xs text-neutral-600">
                              Código: {codigoEquipamento(item.equipamento)}
                            </p>
                          </div>
                        </label>

                        {jaDevolvido ? (
                          <span className="rounded-md bg-neutral-200 px-2 py-1 text-xs font-medium text-neutral-700">
                            Devolvido em {formatDateTime(item.devolvidoEm)} (
                            {item.condicaoDevolucao
                              ? labelCondicao(item.condicaoDevolucao)
                              : "—"}
                            )
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <label
                              htmlFor={`condicao-${item.id}`}
                              className="text-xs font-medium text-neutral-700"
                            >
                              Condição na devolução
                            </label>
                            <select
                              id={`condicao-${item.id}`}
                              value={condicao}
                              onChange={(e) =>
                                setCondicoes((prev) => ({
                                  ...prev,
                                  [item.id]: e.target
                                    .value as CondicaoDevolucao,
                                }))
                              }
                              className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-900 focus:border-emerald-600 focus:outline-none"
                            >
                              <option value="BOM_ESTADO">
                                Bom estado (Disponível)
                              </option>
                              <option value="COM_DEFEITO">
                                Com defeito (Em manutenção)
                              </option>
                              <option value="DANIFICADO">
                                Danificado (Em manutenção)
                              </option>
                            </select>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={submitting || selectedCount === 0}
                  onClick={handleSubmitDevolucao}
                  className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Registrando devolução..."
                    : `Confirmar devolução (${selectedCount} ${
                        selectedCount === 1 ? "item" : "itens"
                      })`}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
