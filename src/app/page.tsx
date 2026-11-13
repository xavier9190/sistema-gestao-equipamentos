import Link from "next/link";
import { PainelSituacao } from "@/components/painel-situacao";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Painel de situação
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            IFPE Campus Belo Jardim — resumo dos equipamentos e devoluções em
            aberto ou atrasadas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/emprestimos/novo"
            className="rounded-lg bg-emerald-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Novo empréstimo
          </Link>
          <Link
            href="/devolucoes"
            className="rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Devolução
          </Link>
          <Link
            href="/ler-codigo"
            className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
          >
            Ler código
          </Link>
          <Link
            href="/equipamentos/novo"
            className="rounded-lg border border-emerald-700 px-3.5 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            Novo item +
          </Link>
        </div>
      </div>

      <PainelSituacao />
    </main>
  );
}
