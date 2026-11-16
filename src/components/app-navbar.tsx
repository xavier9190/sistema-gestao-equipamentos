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
  const [menuAberto, setMenuAberto] = useState(false);

  if (pathname === "/login" || pathname.endsWith("/etiqueta")) {
    return null;
  }

  async function handleLogout() {
    setSaindo(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setMenuAberto(false);
      router.push("/login");
      router.refresh();
    } finally {
      setSaindo(false);
    }
  }

  function isActive(href: string): boolean {
    if (href === "/") {
      return pathname === "/" || pathname === "/painel";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            onClick={() => setMenuAberto(false)}
            className="text-sm font-bold tracking-tight text-neutral-900"
          >
            Gestão de Equipamentos
          </Link>

          <nav
            aria-label="Navegação principal"
            className="hidden flex-wrap items-center gap-1 md:flex"
          >
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  isActive(item.href)
                    ? "bg-emerald-700 text-white"
                    : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={saindo}
            className="hidden rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-60 md:inline-flex"
          >
            {saindo ? "Saindo..." : "Sair"}
          </button>

          <button
            type="button"
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white p-2 text-neutral-800 transition hover:bg-neutral-100 md:hidden"
          >
            {menuAberto ? (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuAberto && (
        <nav
          aria-label="Menu móvel"
          className="border-t border-neutral-200 bg-white px-4 py-3 md:hidden"
        >
          <div className="grid grid-cols-2 gap-1.5">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuAberto(false)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  isActive(item.href)
                    ? "bg-emerald-700 text-white"
                    : "border border-neutral-200 text-neutral-800 hover:bg-neutral-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={saindo}
            className="mt-3 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-60"
          >
            {saindo ? "Saindo..." : "Sair"}
          </button>
        </nav>
      )}
    </header>
  );
}
