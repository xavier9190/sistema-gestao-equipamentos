import Link from "next/link";
import { notFound } from "next/navigation";
import { HistoricoTimeline } from "@/components/historico-timeline";
import { OcorrenciasEquipamento } from "@/components/ocorrencias-equipamento";
import { formatarCodigoEquipamento } from "@/lib/codigo-interno";
import { calcularStatusEmprestimo } from "@/lib/emprestimo-status";
import {
  ESTADO_CONSERVACAO_LABEL,
  STATUS_EQUIPAMENTO_UI,
} from "@/lib/equipamento-labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default async function FichaEquipamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const equipamento = await prisma.equipamento.findUnique({
    where: { id },
    include: {
      categoria: { select: { nome: true } },
      equipamentoPrincipal: {
        select: {
          id: true,
          nome: true,
          codigoPatrimonio: true,
          codigoInterno: true,
        },
      },
      acessorios: {
        orderBy: { nome: "asc" },
        select: {
          id: true,
          nome: true,
          codigoPatrimonio: true,
          codigoInterno: true,
          status: true,
        },
      },
      emprestimoItens: {
        where: { devolvidoEm: null },
        take: 1,
        include: {
          emprestimo: {
            include: {
              responsavel: {
                select: {
                  id: true,
                  matricula: true,
                  nome: true,
                  tipo: true,
                  contato: true,
                },
              },
              itens: { select: { devolvidoEm: true } },
            },
          },
        },
      },
    },
  });

  if (!equipamento) {
    notFound();
  }

  const codigo = formatarCodigoEquipamento(equipamento);
  const statusUi = STATUS_EQUIPAMENTO_UI[equipamento.status];
  const emprestimoAtivo = equipamento.emprestimoItens[0]?.emprestimo ?? null;
  const statusEmprestimo = emprestimoAtivo
    ? calcularStatusEmprestimo(emprestimoAtivo)
    : null;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/equipamentos"
            className="text-xs font-medium text-neutral-500 hover:text-neutral-800"
          >
            ← Voltar para Equipamentos
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              {equipamento.nome}
            </h1>
            <span
              className={`inline-flex rounded-full px-3 py-0.5 text-xs font-semibold ${statusUi.className}`}
            >
              {statusUi.label}
            </span>
          </div>
          <p className="mt-1 font-mono text-sm text-neutral-600">{codigo}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {equipamento.codigoInterno && (
            <Link
              href={`/equipamentos/${equipamento.id}/etiqueta`}
              className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Imprimir etiqueta
            </Link>
          )}
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900 uppercase">
            Dados cadastrais
          </h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Categoria</dt>
              <dd className="font-medium text-neutral-900">
                {equipamento.categoria.nome}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Localização</dt>
              <dd className="font-medium text-neutral-900">
                {equipamento.localizacao}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Conservação</dt>
              <dd className="font-medium text-neutral-900">
                {ESTADO_CONSERVACAO_LABEL[equipamento.estadoConservacao]}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Emprestável</dt>
              <dd className="font-medium text-neutral-900">
                {equipamento.emprestavel ? "Sim" : "Não"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Valor aproximado</dt>
              <dd className="font-medium text-neutral-900">
                {equipamento.valorAproximado
                  ? `R$ ${Number(equipamento.valorAproximado).toFixed(2)}`
                  : "Não informado"}
              </dd>
            </div>
            {equipamento.equipamentoPrincipal && (
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Equipamento principal</dt>
                <dd className="font-medium text-emerald-700">
                  <Link
                    href={`/equipamentos/${equipamento.equipamentoPrincipal.id}`}
                    className="hover:underline"
                  >
                    {equipamento.equipamentoPrincipal.nome} (
                    {formatarCodigoEquipamento(equipamento.equipamentoPrincipal)}
                    )
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900 uppercase">
            Situação atual
          </h2>
          {emprestimoAtivo ? (
            <div className="mt-4 space-y-2.5 text-sm">
              {statusEmprestimo === "ATRASADO" && (
                <p className="inline-flex rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800">
                  Empréstimo atrasado
                </p>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Responsável</dt>
                <dd className="font-medium text-neutral-900">
                  {emprestimoAtivo.responsavel.nome} (
                  {emprestimoAtivo.responsavel.matricula})
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Contato</dt>
                <dd className="font-medium text-neutral-900">
                  {emprestimoAtivo.responsavel.contato}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Retirado em</dt>
                <dd className="font-medium text-neutral-900">
                  {formatDateTime(emprestimoAtivo.retiradoEm)}
                </dd>
              </div>
              {emprestimoAtivo.previsaoDevolucao && (
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">Previsão de devolução</dt>
                  <dd className="font-medium text-neutral-900">
                    {formatDateTime(emprestimoAtivo.previsaoDevolucao)}
                  </dd>
                </div>
              )}
            </div>
          ) : equipamento.status === "EM_MANUTENCAO" ? (
            <p className="mt-4 text-sm font-medium text-amber-800">
              Equipamento em manutenção (indisponível para empréstimo).
            </p>
          ) : equipamento.status === "EXTRAVIADO" ? (
            <p className="mt-4 text-sm font-medium text-red-800">
              Equipamento extraviado (indisponível para empréstimo).
            </p>
          ) : (
            <p className="mt-4 text-sm text-neutral-600">
              {equipamento.emprestavel
                ? "Disponível no acervo da Coordenação para empréstimo."
                : "Item não emprestável (sem empréstimo ativo)."}
            </p>
          )}
        </div>
      </section>

      {equipamento.acessorios.length > 0 && (
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900 uppercase">
            Acessórios vinculados
          </h2>
          <ul className="mt-3 divide-y divide-neutral-200 text-sm">
            {equipamento.acessorios.map((acessorio) => (
              <li
                key={acessorio.id}
                className="flex items-center justify-between py-2"
              >
                <Link
                  href={`/equipamentos/${acessorio.id}`}
                  className="font-medium text-emerald-700 hover:underline"
                >
                  {acessorio.nome} (
                  {formatarCodigoEquipamento(acessorio)})
                </Link>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_EQUIPAMENTO_UI[acessorio.status].className}`}
                >
                  {STATUS_EQUIPAMENTO_UI[acessorio.status].label}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <OcorrenciasEquipamento
        equipamentoId={equipamento.id}
        equipamentoStatus={equipamento.status}
        responsavelAtivo={
          emprestimoAtivo
            ? {
                id: emprestimoAtivo.responsavel.id,
                nome: emprestimoAtivo.responsavel.nome,
                matricula: emprestimoAtivo.responsavel.matricula,
              }
            : null
        }
      />

      <HistoricoTimeline mode="equipamento" entityId={equipamento.id} />
    </main>
  );
}
