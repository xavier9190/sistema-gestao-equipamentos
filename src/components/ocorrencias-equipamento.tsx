"use client";

import type { EquipamentoStatus, OcorrenciaTipo } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ResponsavelBusca,
  type ResponsavelResumo,
} from "@/components/responsavel-busca";
import { OCORRENCIA_TIPO_LABEL } from "@/lib/ocorrencia";

interface OcorrenciaDTO {
  id: string;
  tipo: OcorrenciaTipo;
  descricao: string;
  deveRepor: boolean;
  reposicaoConcluidaEm: string | null;
  criadoEm: string;
  responsavel: {
    id: string;
    nome: string;
    matricula: string;
    contato: string;
  } | null;
}

interface OcorrenciasEquipamentoProps {
  equipamentoId: string;
  equipamentoStatus: EquipamentoStatus;
  responsavelAtivo?: {
    id: string;
    nome: string;
    matricula: string;
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

export function OcorrenciasEquipamento({
  equipamentoId,
  equipamentoStatus,
  responsavelAtivo,
}: OcorrenciasEquipamentoProps) {
  const router = useRouter();
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [formAberto, setFormAberto] = useState(false);

  const [tipo, setTipo] = useState<OcorrenciaTipo>("DANO");
  const [descricao, setDescricao] = useState("");
  const [impedeUso, setImpedeUso] = useState(true);
  const [deveRepor, setDeveRepor] = useState(false);
  const [responsavelSelecionado, setResponsavelSelecionado] =
    useState<ResponsavelResumo | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [concluindoId, setConcluindoId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const carregar = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      let aborted = false;
      try {
        const res = await fetch(
          `/api/ocorrencias?equipamentoId=${encodeURIComponent(equipamentoId)}`,
          { cache: "no-store", signal }
        );
        const data = (await res.json()) as {
          ok?: boolean;
          message?: string;
          ocorrencias?: OcorrenciaDTO[];
        };
        if (!res.ok || !data.ok) {
          setErrorMsg(data.message ?? "Erro ao carregar ocorrências.");
          return;
        }
        setOcorrencias(data.ocorrencias ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          aborted = true;
        }
      } finally {
        if (!aborted) {
          setLoading(false);
        }
      }
    },
    [equipamentoId]
  );

  useEffect(() => {
    const controller = new AbortController();
    void carregar(controller.signal);
    return () => controller.abort();
  }, [carregar]);

  async function handleRegistrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const respId =
        responsavelSelecionado?.id ?? responsavelAtivo?.id ?? null;

      const res = await fetch("/api/ocorrencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipamentoId,
          responsavelId: respId,
          tipo,
          descricao,
          deveRepor,
          impedeUso: tipo === "PERDA" ? true : impedeUso,
        }),
      });

      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.message ?? "Erro ao registrar ocorrência.");
        return;
      }

      setDescricao("");
      setDeveRepor(false);
      setImpedeUso(true);
      setResponsavelSelecionado(null);
      setFormAberto(false);
      setSuccessMsg("Ocorrência registrada com sucesso.");
      await carregar();
      router.refresh();
    } catch {
      setErrorMsg("Falha de comunicação ao registrar ocorrência.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConcluir(ocorrenciaId: string) {
    setErrorMsg(null);
    setSuccessMsg(null);
    setConcluindoId(ocorrenciaId);
    try {
      const res = await fetch(`/api/ocorrencias/${ocorrenciaId}/concluir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.message ?? "Erro ao concluir ocorrência.");
        return;
      }

      setSuccessMsg(
        "Reposição/retorno concluído. Equipamento disponível novamente."
      );
      await carregar();
      router.refresh();
    } catch {
      setErrorMsg("Falha de comunicação ao concluir ocorrência.");
    } finally {
      setConcluindoId(null);
    }
  }

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase text-neutral-900">
            Ocorrências e reposição
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Registre perda, dano ou defeito e conclua reposições ou retornos de
            manutenção.
          </p>
        </div>

        <button
          type="button"
          disabled={equipamentoStatus === "EXTRAVIADO"}
          onClick={() => {
            setErrorMsg(null);
            setSuccessMsg(null);
            setFormAberto((prev) => !prev);
          }}
          className="rounded-lg bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {formAberto ? "Cancelar" : "Registrar ocorrência"}
        </button>
      </div>

      {equipamentoStatus === "EXTRAVIADO" && (
        <p className="mt-2 text-xs text-red-700">
          Item extraviado: conclua a reposição pendente abaixo antes de
          registrar nova ocorrência.
        </p>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
        >
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          {successMsg}
        </div>
      )}

      {formAberto && (
        <form
          onSubmit={handleRegistrar}
          className="mt-4 space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="ocorrencia-tipo"
                className="block text-xs font-semibold text-neutral-700"
              >
                Tipo de ocorrência
              </label>
              <select
                id="ocorrencia-tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as OcorrenciaTipo)}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none"
              >
                <option value="DANO">Dano</option>
                <option value="DEFEITO">Defeito</option>
                <option value="PERDA">Perda</option>
              </select>
            </div>

            <div className="flex flex-col justify-end gap-2">
              {tipo !== "PERDA" && (
                <label className="flex items-center gap-2 text-xs font-medium text-neutral-800">
                  <input
                    type="checkbox"
                    checked={impedeUso}
                    onChange={(e) => setImpedeUso(e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-emerald-700"
                  />
                  Impede o uso (mover para Em manutenção)
                </label>
              )}
              <label className="flex items-center gap-2 text-xs font-medium text-neutral-800">
                <input
                  type="checkbox"
                  checked={deveRepor}
                  onChange={(e) => setDeveRepor(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-emerald-700"
                />
                Responsável deve repor este item
              </label>
            </div>
          </div>

          <div>
            <label
              htmlFor="ocorrencia-descricao"
              className="block text-xs font-semibold text-neutral-700"
            >
              Descrição / motivo
            </label>
            <textarea
              id="ocorrencia-descricao"
              required
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o ocorrido (ex: tela quebrada, extravio em aula, defeito na fonte)..."
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-neutral-700">
              Responsável vinculado{" "}
              {responsavelAtivo && !responsavelSelecionado
                ? `(empréstimo ativo: ${responsavelAtivo.nome} — ${responsavelAtivo.matricula})`
                : "(opcional, obrigatório se 'Deve repor' estiver marcado)"}
            </p>
            <ResponsavelBusca
              selectedId={responsavelSelecionado?.id ?? null}
              onSelect={setResponsavelSelecionado}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
            >
              {submitting ? "Salvando..." : "Salvar ocorrência"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-neutral-500">
          Carregando ocorrências...
        </p>
      ) : ocorrencias.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-600">
          Nenhuma ocorrência registrada para este equipamento.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {ocorrencias.map((oc) => {
            const pendente = oc.reposicaoConcluidaEm === null;
            return (
              <li
                key={oc.id}
                className={`rounded-lg border p-3.5 ${
                  pendente
                    ? "border-amber-200 bg-amber-50/40"
                    : "border-neutral-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-neutral-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                        {OCORRENCIA_TIPO_LABEL[oc.tipo]}
                      </span>
                      {oc.deveRepor && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            pendente
                              ? "bg-red-100 text-red-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {pendente
                            ? "Reposição pendente"
                            : "Reposição concluída"}
                        </span>
                      )}
                      {!oc.deveRepor && (
                        <span className="text-xs font-medium text-neutral-600">
                          {pendente ? "Em aberto" : "Concluída"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-neutral-900">
                      {oc.descricao}
                    </p>
                    <p className="mt-1 text-xs text-neutral-600">
                      Registrada em {formatDateTime(oc.criadoEm)}
                      {oc.responsavel &&
                        ` · Responsável: ${oc.responsavel.nome} (${oc.responsavel.matricula})`}
                    </p>
                    {oc.reposicaoConcluidaEm && (
                      <p className="mt-0.5 text-xs text-emerald-800">
                        Concluída em {formatDateTime(oc.reposicaoConcluidaEm)}
                      </p>
                    )}
                  </div>

                  {pendente && (
                    <button
                      type="button"
                      disabled={concluindoId === oc.id}
                      onClick={() => void handleConcluir(oc.id)}
                      className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                    >
                      {concluindoId === oc.id
                        ? "Concluindo..."
                        : oc.deveRepor
                          ? "Concluir reposição"
                          : "Retornar da manutenção"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
