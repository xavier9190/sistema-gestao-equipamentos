"use client";

import type { ResponsavelTipo } from "@prisma/client";
import { useEffect, useState, type FormEvent } from "react";
import { RESPONSAVEL_TIPO_LABEL } from "@/lib/responsavel";

export interface ResponsavelResumo {
  id: string;
  matricula: string;
  nome: string;
  tipo: ResponsavelTipo;
  contato: string;
  ativo: boolean;
  pendenciasReposicao?: number;
}

interface ResponsavelBuscaProps {
  selectedId?: string | null;
  onSelect: (responsavel: ResponsavelResumo) => void;
}

export function ResponsavelBusca({
  selectedId,
  onSelect,
}: ResponsavelBuscaProps) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ResponsavelResumo[]>([]);
  const [buscando, setBuscando] = useState(false);

  const [showQuickForm, setShowQuickForm] = useState(false);
  const [matricula, setMatricula] = useState("");
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<ResponsavelTipo>("DISCENTE");
  const [contato, setContato] = useState("");
  const [erroCadastro, setErroCadastro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResultados([]);
      return;
    }

    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await fetch(
          `/api/responsaveis?q=${encodeURIComponent(trimmed)}&ativo=true`
        );
        if (res.ok) {
          const data = (await res.json()) as {
            responsaveis?: ResponsavelResumo[];
          };
          setResultados(data.responsaveis ?? []);
        }
      } finally {
        setBuscando(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  async function handleQuickCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErroCadastro(null);
    setSalvando(true);

    try {
      const res = await fetch("/api/responsaveis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricula, nome, tipo, contato }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        responsavel?: ResponsavelResumo;
      };

      if (!res.ok || !data.ok || !data.responsavel) {
        setErroCadastro(data.message ?? "Erro ao cadastrar responsável.");
        return;
      }

      onSelect(data.responsavel);
      setQuery(data.responsavel.matricula);
      setResultados([data.responsavel]);
      setShowQuickForm(false);
      setMatricula("");
      setNome("");
      setContato("");
    } catch {
      setErroCadastro("Erro de conexão ao cadastrar responsável.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-60 flex-1">
          <label
            htmlFor="busca-responsavel"
            className="block text-sm font-medium text-neutral-700"
          >
            Responsável (Matrícula ou nome)
          </label>
          <input
            id="busca-responsavel"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Matrícula ou nome"
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowQuickForm((prev) => !prev)}
          className="rounded-lg border border-emerald-700 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          {showQuickForm ? "Fechar cadastro rápido" : "+ Cadastro rápido"}
        </button>
      </div>

      {buscando && (
        <p className="text-xs text-neutral-500">Buscando responsáveis...</p>
      )}

      {!buscando && query.trim() !== "" && resultados.length === 0 && (
        <p className="text-xs text-neutral-500">
          Nenhum responsável encontrado. Use &quot;+ Cadastro rápido&quot; para
          cadastrar no balcão.
        </p>
      )}

      {resultados.length > 0 && (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {resultados.map((item) => {
            const isSelected = selectedId === item.id;
            const pendencias = item.pendenciasReposicao ?? 0;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-neutral-50 ${
                    isSelected ? "bg-emerald-50/70" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium text-neutral-900">
                      {item.nome}{" "}
                      <span className="font-mono text-xs text-neutral-600">
                        ({item.matricula})
                      </span>
                    </p>
                    <p className="text-xs text-neutral-500">
                      {RESPONSAVEL_TIPO_LABEL[item.tipo]} • {item.contato}
                    </p>
                  </div>

                  {pendencias > 0 && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                      {pendencias} reposição pendente
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {showQuickForm && (
        <form
          onSubmit={handleQuickCreate}
          className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4"
        >
          <p className="text-xs font-semibold text-neutral-700 uppercase">
            Cadastro rápido no balcão
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              required
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              placeholder="Matrícula *"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm focus:border-emerald-600 focus:outline-none"
            />
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo *"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm focus:border-emerald-600 focus:outline-none"
            />
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as ResponsavelTipo)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm focus:border-emerald-600 focus:outline-none"
            >
              <option value="DISCENTE">Discente</option>
              <option value="DOCENTE">Docente</option>
              <option value="SERVIDOR">Servidor</option>
            </select>
            <input
              type="text"
              required
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              placeholder="E-mail ou WhatsApp *"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {erroCadastro && (
            <p className="text-xs font-medium text-red-700">{erroCadastro}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Cadastrar e selecionar"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
