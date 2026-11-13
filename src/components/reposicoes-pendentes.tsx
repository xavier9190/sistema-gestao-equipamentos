"use client";

import type { OcorrenciaTipo } from "@prisma/client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OCORRENCIA_TIPO_LABEL } from "@/lib/ocorrencia";

interface OcorrenciaPendenteDTO {
  id: string;
  equipamentoId: string;
  tipo: OcorrenciaTipo;
  descricao: string;
  deveRepor: boolean;
  criadoEm: string;
  equipamento: {
    id: string;
    nome: string;
    codigoPatrimonio: string | null;
    codigoInterno: string | null;
    status: string;
  };
  responsavel: {
    id: string;
    nome: string;
    matricula: string;
    contato: string;
  } | null;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function ReposicoesPendentes() {
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaPendenteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [somenteReposicao, setSomenteReposicao] = useState(false);
  const [concluindoId, setConcluindoId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const carregar = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setErrorMsg(null);
    let aborted = false;
    try {
      const res = await fetch("/api/ocorrencias?pendentes=true", {
        cache: "no-store",
        signal,
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        ocorrencias?: OcorrenciaPendenteDTO[];
      };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.message ?? "Erro ao carregar ocorrências.");
        return;
      }
      setOcorrencias(data.ocorrencias ?? []);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        aborted = true;
        return;
      }
      setErrorMsg("Falha de comunicação ao carregar ocorrências.");
    } finally {
      if (!aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void carregar(controller.signal);
    return () => controller.abort();
  }, [carregar]);

  const filtradas = useMemo(
    () =>
      somenteReposicao
        ? ocorrencias.filter((o) => o.deveRepor)
        : ocorrencias,
    [ocorrencias, somenteReposicao]
  );

  async function handleConcluir(id: string) {
    setErrorMsg(null);
    setConcluindoId(id);
    try {
      const res = await fetch(`/api/ocorrencias/${id}/concluir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.message ?? "Erro ao concluir ocorrência.");
        return;
      }
      await carregar();
    } catch {
      setErrorMsg("Falha de comunicação ao concluir ocorrência.");
    } finally {
      setConcluindoId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSomenteReposicao(false)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              !somenteReposicao
                ? "bg-neutral-900 text-white"
                : "border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            Todas pendentes ({ocorrencias.length})
          </button>
          <button
            type="button"
            onClick={() => setSomenteReposicao(true)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              somenteReposicao
                ? "bg-red-700 text-white"
                : "border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            Com reposição devida (
            {ocorrencias.filter((o) => o.deveRepor).length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => void carregar()}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Atualizar
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

      {loading ? (
        <p className="text-sm text-neutral-500">Carregando ocorrências...</p>
      ) : filtradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-600">
          Nenhuma ocorrência ou reposição pendente encontrada.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtradas.map((oc) => {
            const codigo =
              oc.equipamento.codigoPatrimonio ??
              oc.equipamento.codigoInterno ??
              "Sem código";
            return (
              <li
                key={oc.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/equipamentos/${oc.equipamento.id}`}
                        className="font-semibold text-emerald-700 hover:underline"
                      >
                        {oc.equipamento.nome} ({codigo})
                      </Link>
                      <span className="rounded-full bg-neutral-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                        {OCORRENCIA_TIPO_LABEL[oc.tipo]}
                      </span>
                      {oc.deveRepor && (
                        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                          Reposição devida
                        </span>
                      )}
                    </div>

                    <p className="mt-1.5 text-sm text-neutral-800">
                      {oc.descricao}
                    </p>
                    <p className="mt-1 text-xs text-neutral-600">
                      Registrada em {formatDateTime(oc.criadoEm)}
                      {oc.responsavel &&
                        ` · Responsável: ${oc.responsavel.nome} (${oc.responsavel.matricula}) — ${oc.responsavel.contato}`}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={concluindoId === oc.id}
                    onClick={() => void handleConcluir(oc.id)}
                    className="rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {concluindoId === oc.id
                      ? "Concluindo..."
                      : oc.deveRepor
                        ? "Concluir reposição"
                        : "Retornar da manutenção"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
