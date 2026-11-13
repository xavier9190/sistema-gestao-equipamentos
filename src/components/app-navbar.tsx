"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Painel" },
  { href: "/emprestimos/novo", label: "Novo empréstimo" },
  { href: "/devolucoes", label: "Devolução" },
  { href: "/ler-codigo", label: "Ler código" },
  { href: "/equipamentos", label: "Equipamentos" },
  { href: "/responsaveis", label: "Responsáveis" },
  { href: "/ocorrencias", label: "Ocorrências" },
  { href: "/relatorios", label: "Relatórios / CSV" },
] as const;

export function AppNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  if (pathname === "/login" || pathname.endsWith("/etiqueta")) {
    return null;
  }

  async function handleLogout() {
    setSaindo(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setSaindo(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/"
            className="text-sm font-bold tracking-tight text-neutral-900"
          >
            Gestão de Equipamentos
          </Link>

          <nav
            aria-label="Navegação principal"
            className="flex flex-wrap items-center gap-1"
          >
            {NAV_LINKS.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/" || pathname === "/painel"
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-emerald-700 text-white"
                      : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={saindo}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-60"
        >
          {saindo ? "Saindo..." : "Sair"}
        </button>
      </div>
    </header>
  );
}
