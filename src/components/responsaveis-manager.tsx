"use client";

import type { ResponsavelTipo } from "@prisma/client";
import { useState, type FormEvent } from "react";
import { HistoricoTimeline } from "@/components/historico-timeline";
import { RESPONSAVEL_TIPO_LABEL } from "@/lib/responsavel";
import type { ResponsavelResumo } from "./responsavel-busca";

interface ResponsaveisManagerProps {
  initialResponsaveis: ResponsavelResumo[];
}

export function ResponsaveisManager({
  initialResponsaveis,
}: ResponsaveisManagerProps) {
  const [lista, setLista] = useState<ResponsavelResumo[]>(initialResponsaveis);
  const [q, setQ] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [ativoFiltro, setAtivoFiltro] = useState("true");
  const [carregando, setCarregando] = useState(false);

  const [formAberto, setFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [matricula, setMatricula] = useState("");
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<ResponsavelTipo>("DISCENTE");
  const [contato, setContato] = useState("");
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [historicoResp, setHistoricoResp] = useState<ResponsavelResumo | null>(
    null
  );

  async function recarregar(
    nextQ = q,
    nextTipo = tipoFiltro,
    nextAtivo = ativoFiltro
  ) {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (nextQ.trim()) params.set("q", nextQ.trim());
      if (nextTipo) params.set("tipo", nextTipo);
      if (nextAtivo) params.set("ativo", nextAtivo);

      const res = await fetch(`/api/responsaveis?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as {
          responsaveis?: ResponsavelResumo[];
        };
        setLista(data.responsaveis ?? []);
      }
    } finally {
      setCarregando(false);
    }
  }

  function abrirNovo() {
    setEditandoId(null);
    setMatricula("");
    setNome("");
    setTipo("DISCENTE");
    setContato("");
    setErroForm(null);
    setFormAberto(true);
  }

  function abrirEdicao(item: ResponsavelResumo) {
    setEditandoId(item.id);
    setMatricula(item.matricula);
    setNome(item.nome);
    setTipo(item.tipo);
    setContato(item.contato);
    setErroForm(null);
    setFormAberto(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErroForm(null);
    setSalvando(true);

    try {
      const url = editandoId
        ? `/api/responsaveis/${editandoId}`
        : "/api/responsaveis";
      const method = editandoId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricula, nome, tipo, contato }),
      });

      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setErroForm(data.message ?? "Não foi possível salvar.");
        return;
      }

      setFormAberto(false);
      await recarregar();
    } catch {
      setErroForm("Erro de conexão ao salvar responsável.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleToggleAtivo(item: ResponsavelResumo) {
    const res = await fetch(`/api/responsaveis/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !item.ativo }),
    });

    if (res.ok) {
      await recarregar();
    }
  }

  async function handleFiltrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await recarregar();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form
          onSubmit={handleFiltrar}
          className="flex flex-1 flex-wrap items-center gap-2"
        >
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por matrícula ou nome"
            className="min-w-60 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
          />
          <select
            value={tipoFiltro}
            onChange={(e) => {
              setTipoFiltro(e.target.value);
              void recarregar(q, e.target.value, ativoFiltro);
            }}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
          >
            <option value="">Todos os tipos</option>
            <option value="DISCENTE">Discente</option>
            <option value="DOCENTE">Docente</option>
            <option value="SERVIDOR">Servidor</option>
          </select>
          <select
            value={ativoFiltro}
            onChange={(e) => {
              setAtivoFiltro(e.target.value);
              void recarregar(q, tipoFiltro, e.target.value);
            }}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
          >
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
            <option value="">Todos</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Buscar
          </button>
        </form>

        <button
          type="button"
          onClick={abrirNovo}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Novo responsável +
        </button>
      </div>

      {formAberto && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">
              {editandoId ? "Editar responsável" : "Novo responsável"}
            </h2>
            <button
              type="button"
              onClick={() => setFormAberto(false)}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-800"
            >
              Fechar
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-neutral-700">
                Matrícula *
              </label>
              <input
                type="text"
                required
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="Ex: 20261001"
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700">
                Nome completo *
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do responsável"
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700">
                Tipo *
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as ResponsavelTipo)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              >
                <option value="DISCENTE">Discente</option>
                <option value="DOCENTE">Docente</option>
                <option value="SERVIDOR">Servidor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700">
                Contato (e-mail ou WhatsApp) *
              </label>
              <input
                type="text"
                required
                value={contato}
                onChange={(e) => setContato(e.target.value)}
                placeholder="Ex: (81) 99999-0000 ou email@ifpe.edu.br"
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {erroForm && (
            <div
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {erroForm}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormAberto(false)}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      )}

      {carregando ? (
        <p className="text-sm text-neutral-500">Carregando responsáveis...</p>
      ) : lista.length === 0 ? (
        <section className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <p className="text-sm text-neutral-600">
            Nenhum responsável encontrado.
          </p>
        </section>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-600 uppercase">
              <tr>
                <th className="px-4 py-3">Matrícula</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {lista.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-neutral-800">
                    {item.matricula}
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    {item.nome}
                    {(item.pendenciasReposicao ?? 0) > 0 && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                        Reposição pendente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {RESPONSAVEL_TIPO_LABEL[item.tipo]}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{item.contato}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        item.ativo
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {item.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setHistoricoResp((prev) =>
                            prev?.id === item.id ? null : item
                          )
                        }
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                          historicoResp?.id === item.id
                            ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                            : "border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                        }`}
                      >
                        Histórico
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirEdicao(item)}
                        className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAtivo(item)}
                        className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                      >
                        {item.ativo ? "Desativar" : "Reativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {historicoResp && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-800">
              Histórico de {historicoResp.nome} ({historicoResp.matricula})
            </p>
            <button
              type="button"
              onClick={() => setHistoricoResp(null)}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-800"
            >
              Fechar histórico
            </button>
          </div>
          <HistoricoTimeline
            key={historicoResp.id}
            mode="responsavel"
            entityId={historicoResp.id}
            title={`Linha do tempo — ${historicoResp.nome}`}
          />
        </div>
      )}
    </div>
  );
}
