import Link from "next/link";
import { RelatoriosView } from "@/components/relatorios-view";

export const dynamic = "force-dynamic";

export default function RelatoriosPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Relatórios e histórico geral
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Consulte todas as movimentações por período, evento, equipamento ou
            responsável e exporte em CSV para conferência e auditorias.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/painel"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Painel de situação
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Início
          </Link>
        </div>
      </div>

      <RelatoriosView />
    </main>
  );
}
