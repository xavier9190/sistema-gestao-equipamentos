import Link from "next/link";
import { PainelSituacao } from "@/components/painel-situacao";

export const dynamic = "force-dynamic";

export default function PainelPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Painel de situação
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Resumo dos equipamentos por status e devoluções em aberto ou
            atrasadas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/emprestimos/novo"
            className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Novo empréstimo
          </Link>
          <Link
            href="/devolucoes"
            className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Devolução
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Início
          </Link>
        </div>
      </div>

      <PainelSituacao />
    </main>
  );
}
