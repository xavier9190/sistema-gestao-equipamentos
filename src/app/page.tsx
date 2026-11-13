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
      <LogoutButton />
    </main>
  );
}
