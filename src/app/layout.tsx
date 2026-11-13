import type { Metadata } from "next";
import { AppNavbar } from "@/components/app-navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestão de Equipamentos — IFPE Campus Belo Jardim",
  description: "Sistema de controle de empréstimos, devoluções e inventário da coordenação.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <AppNavbar />
        {children}
      </body>
    </html>
  );
}
