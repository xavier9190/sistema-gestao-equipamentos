import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight">
        Gestão de Equipamentos
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        IFPE Campus Belo Jardim — Coordenação autenticada.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/equipamentos"
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          Equipamentos
        </Link>
        <Link
          href="/responsaveis"
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
        >
          Responsáveis
        </Link>
        <Link
          href="/equipamentos/novo"
          className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
        >
          Novo item +
        </Link>
      </div>

      <LogoutButton />
    </main>
  );
}
