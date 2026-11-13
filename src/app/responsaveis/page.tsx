import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { ResponsaveisManager } from "@/components/responsaveis-manager";
import { listarResponsaveisComPendencias } from "@/lib/responsavel-prisma";

export const dynamic = "force-dynamic";

export default async function ResponsaveisPage() {
  const initialResponsaveis = await listarResponsaveisComPendencias({
    ativo: true,
  });

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-xs font-medium text-neutral-500 hover:text-neutral-800"
          >
            ← Início
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
            Responsáveis
          </h1>
          <p className="text-sm text-neutral-600">
            Cadastro e busca por matrícula de docentes, discentes e servidores.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/equipamentos"
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Equipamentos
          </Link>
          <div className="[&>button]:mt-0">
            <LogoutButton />
          </div>
        </div>
      </header>

      <ResponsaveisManager initialResponsaveis={initialResponsaveis} />
    </main>
  );
}
