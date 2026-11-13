"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { LeitorCodigo } from "@/components/leitor-codigo";
import {
  ResponsavelBusca,
  type ResponsavelResumo,
} from "@/components/responsavel-busca";
import { formatarCodigoEquipamento } from "@/lib/codigo-interno";
import type { EquipamentoBuscaRecord } from "@/lib/equipamento-busca";

interface ItemNoCarrinho {
  id: string;
  nome: string;
  codigo: string;
  vinculadoA?: string;
}

function adicionarEquipamentoNaLista(
  prev: ItemNoCarrinho[],
  eq: EquipamentoBuscaRecord
): { next: ItemNoCarrinho[]; aviso: string | null } {
  if (!eq.emprestavel) {
    return {
      next: prev,
      aviso: `"${eq.nome}" está marcado como não emprestável.`,
    };
  }

  if (eq.status !== "DISPONIVEL") {
    return {
      next: prev,
      aviso: `"${eq.nome}" não está disponível para empréstimo (status: ${eq.status}).`,
    };
  }

  const existingIds = new Set(prev.map((item) => item.id));
  const next = [...prev];

  if (!existingIds.has(eq.id)) {
    next.push({
      id: eq.id,
      nome: eq.nome,
      codigo: formatarCodigoEquipamento(eq),
    });
    existingIds.add(eq.id);
  }

  for (const acc of eq.acessoriosDisponiveis) {
    if (!existingIds.has(acc.id)) {
      next.push({
        id: acc.id,
        nome: acc.nome,
        codigo: formatarCodigoEquipamento(acc),
        vinculadoA: eq.nome,
      });
      existingIds.add(acc.id);
    }
  }

  return { next, aviso: null };
}

export function NovoEmprestimoForm({
  initialEquipamento,
}: {
  initialEquipamento: EquipamentoBuscaRecord | null;
}) {
  const initialState = initialEquipamento
    ? adicionarEquipamentoNaLista([], initialEquipamento)
    : { next: [], aviso: null };

  const [itens, setItens] = useState<ItemNoCarrinho[]>(initialState.next);
  const [responsavel, setResponsavel] = useState<ResponsavelResumo | null>(
    null
  );
  const [motivo, setMotivo] = useState("");
  const [previsaoDevolucao, setPrevisaoDevolucao] = useState("");

  const [avisoItem, setAvisoItem] = useState<string | null>(initialState.aviso);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [sucessoId, setSucessoId] = useState<string | null>(null);

  function handleEquipamentoLido(eq: EquipamentoBuscaRecord) {
    setItens((prev) => {
      const { next, aviso } = adicionarEquipamentoNaLista(prev, eq);
      setAvisoItem(aviso);
      return next;
    });
  }

  function removerItem(id: string) {
    setItens((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleConfirmar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErroEnvio(null);

    if (itens.length === 0) {
      setErroEnvio("Adicione pelo menos um equipamento ao empréstimo.");
      return;
    }
    if (!responsavel) {
      setErroEnvio("Selecione ou cadastre o responsável pela retirada.");
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch("/api/emprestimos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responsavelId: responsavel.id,
          equipamentoIds: itens.map((item) => item.id),
          motivo,
          previsaoDevolucao: previsaoDevolucao
            ? new Date(previsaoDevolucao).toISOString()
            : null,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        emprestimo?: { id: string };
      };

      if (!res.ok || !data.ok || !data.emprestimo) {
        setErroEnvio(data.message ?? "Não foi possível registrar o empréstimo.");
        return;
      }

      setSucessoId(data.emprestimo.id);
    } catch {
      setErroEnvio("Erro de conexão ao registrar empréstimo.");
    } finally {
      setSalvando(false);
    }
  }

  function resetarParaNovo() {
    setSucessoId(null);
    setItens([]);
    setResponsavel(null);
    setMotivo("");
    setPrevisaoDevolucao("");
    setAvisoItem(null);
    setErroEnvio(null);
  }

  if (sucessoId) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <h2 className="text-lg font-bold text-emerald-900">
          Empréstimo registrado com sucesso!
        </h2>
        <p className="mt-1 text-sm text-emerald-800">
          {itens.length}{" "}
          {itens.length === 1 ? "item vinculado" : "itens vinculados"} a{" "}
          <span className="font-semibold">{responsavel?.nome}</span>.
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={resetarParaNovo}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Registrar outro empréstimo
          </button>
          <Link
            href="/equipamentos"
            className="rounded-lg border border-emerald-700 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
          >
            Ver equipamentos
          </Link>
        </div>
      </section>
    );
  }

  const pendencias = responsavel?.pendenciasReposicao ?? 0;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900 uppercase">
          1. Adicionar equipamentos (leitor USB, câmera ou código)
        </h2>
        <LeitorCodigo onEquipamentoEncontrado={handleEquipamentoLido} />

        {avisoItem && (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          >
            {avisoItem}
          </div>
        )}

        <div className="mt-4">
          {itens.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Nenhum equipamento adicionado ainda.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
              {itens.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium text-neutral-900">
                      <span className="mr-2 font-mono text-xs text-neutral-600">
                        {item.codigo}
                      </span>
                      {item.nome}
                    </p>
                    {item.vinculadoA && (
                      <p className="text-xs text-emerald-700">
                        Acessório vinculado automaticamente a {item.vinculadoA}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removerItem(item.id)}
                    className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <form
        onSubmit={handleConfirmar}
        className="space-y-5 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-neutral-900 uppercase">
          2. Responsável e detalhes da retirada
        </h2>

        <ResponsavelBusca
          selectedId={responsavel?.id}
          onSelect={setResponsavel}
        />

        {responsavel && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-sm text-emerald-950">
            Selecionado:{" "}
            <span className="font-semibold">{responsavel.nome}</span> (
            {responsavel.matricula})
          </div>
        )}

        {pendencias > 0 && (
          <div
            role="alert"
            className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-3 text-sm text-amber-950"
          >
            <strong className="font-semibold">
              Alerta de reposição pendente:
            </strong>{" "}
            este responsável possui {pendencias}{" "}
            {pendencias === 1 ? "item pendente" : "itens pendentes"} de
            reposição. O empréstimo não está bloqueado e fica a critério da
            Coordenação.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="motivo"
              className="block text-sm font-medium text-neutral-700"
            >
              Motivo da retirada *
            </label>
            <input
              id="motivo"
              type="text"
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Aula prática Lab 04, Evento auditório"
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="previsaoDevolucao"
              className="block text-sm font-medium text-neutral-700"
            >
              Previsão de devolução (opcional)
            </label>
            <input
              id="previsaoDevolucao"
              type="datetime-local"
              value={previsaoDevolucao}
              onChange={(e) => setPrevisaoDevolucao(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        {erroEnvio && (
          <div
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {erroEnvio}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link
            href="/equipamentos"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={salvando}
            className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
          >
            {salvando ? "Confirmando..." : "Confirmar empréstimo"}
          </button>
        </div>
      </form>
    </div>
  );
}
