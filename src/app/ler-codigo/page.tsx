"use client";

import Link from "next/link";
import { useState } from "react";
import { LeitorCodigo } from "@/components/leitor-codigo";
import { formatarCodigoEquipamento } from "@/lib/codigo-interno";
import type { EquipamentoBuscaRecord } from "@/lib/equipamento-busca";
import { STATUS_EQUIPAMENTO_UI } from "@/lib/equipamento-labels";

export default function LerCodigoPage() {
  const [equipamento, setEquipamento] = useState<EquipamentoBuscaRecord | null>(
    null
  );

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-xs font-medium text-neutral-500 hover:text-neutral-800"
          >
            ← Início
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
            Ler código
          </h1>
          <p className="text-sm text-neutral-600">
            Identifique um equipamento usando leitor USB, câmera ou digitação
            manual.
          </p>
        </div>

        <Link
          href="/equipamentos"
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Equipamentos
        </Link>
      </header>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <LeitorCodigo onEquipamentoEncontrado={setEquipamento} />
      </section>

      {equipamento && (
        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-sm font-semibold text-neutral-600">
                {formatarCodigoEquipamento(equipamento)}
              </p>
              <h2 className="mt-0.5 text-xl font-bold text-neutral-900">
                {equipamento.nome}
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                {equipamento.categoria} • {equipamento.localizacao}
              </p>
            </div>

            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_EQUIPAMENTO_UI[equipamento.status].className}`}
            >
              {STATUS_EQUIPAMENTO_UI[equipamento.status].label}
            </span>
          </div>

          {equipamento.emprestimoAtivo && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              Emprestado para{" "}
              <span className="font-semibold">
                {equipamento.emprestimoAtivo.responsavelNome}
              </span>{" "}
              ({equipamento.emprestimoAtivo.responsavelMatricula}).
            </div>
          )}

          {equipamento.acessoriosDisponiveis.length > 0 && (
            <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
              <p className="text-xs font-semibold text-neutral-700 uppercase">
                Acessórios vinculados disponíveis
              </p>
              <ul className="mt-1 space-y-1 text-neutral-700">
                {equipamento.acessoriosDisponiveis.map((acc) => (
                  <li key={acc.id}>
                    • {acc.nome} ({formatarCodigoEquipamento(acc)})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            {equipamento.status === "DISPONIVEL" && equipamento.emprestavel && (
              <Link
                href={`/emprestimos/novo?equipamentoId=${equipamento.id}`}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Emprestar
              </Link>
            )}
            {equipamento.status === "EMPRESTADO" &&
              equipamento.emprestimoAtivo && (
                <Link
                  href={`/devolucoes?emprestimoId=${equipamento.emprestimoAtivo.emprestimoId}`}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Registrar devolução
                </Link>
              )}
            <Link
              href={`/equipamentos/${equipamento.id}`}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              Abrir ficha do equipamento
            </Link>
            {equipamento.codigoInterno && (
              <Link
                href={`/equipamentos/${equipamento.id}/etiqueta`}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Imprimir etiqueta
              </Link>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
