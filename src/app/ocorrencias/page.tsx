import Link from "next/link";
import { ReposicoesPendentes } from "@/components/reposicoes-pendentes";

export const dynamic = "force-dynamic";

export default function OcorrenciasPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Ocorrências e reposições pendentes
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Acompanhe itens extraviados ou em manutenção e dê baixa quando a
            reposição ou reparo for concluído.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/equipamentos"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Equipamentos
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Início
          </Link>
        </div>
      </div>

      <ReposicoesPendentes />
    </main>
  );
}
