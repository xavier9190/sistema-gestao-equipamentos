import Link from "next/link";
import { DevolucaoFlow } from "@/components/devolucao-flow";

export const dynamic = "force-dynamic";

export default async function DevolucoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const emprestimoId = Array.isArray(params.emprestimoId)
    ? params.emprestimoId[0]
    : params.emprestimoId;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Registrar devolução
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Confira os itens devolvidos, informe a condição de retorno e
            encerre empréstimos completos ou parciais.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/ler-codigo"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Ler código
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Início
          </Link>
        </div>
      </div>

      <DevolucaoFlow initialEmprestimoId={emprestimoId} />
    </main>
  );
}
