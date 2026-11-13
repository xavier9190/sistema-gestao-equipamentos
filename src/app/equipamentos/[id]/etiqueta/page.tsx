import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { gerarQrCodeSvg } from "@/lib/etiqueta-qr";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EtiquetaEquipamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const equipamento = await prisma.equipamento.findUnique({
    where: { id },
    include: {
      categoria: { select: { nome: true } },
    },
  });

  if (!equipamento) {
    notFound();
  }

  const codigo = equipamento.codigoInterno ?? equipamento.codigoPatrimonio;
  if (!codigo) {
    notFound();
  }

  const qrSvg = await gerarQrCodeSvg(codigo);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center p-6">
      <div className="mb-6 flex w-full items-center justify-between print:hidden">
        <Link
          href="/equipamentos"
          className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
        >
          ← Voltar para Equipamentos
        </Link>
        <PrintButton />
      </div>

      <section className="flex w-full max-w-sm flex-col items-center rounded-xl border-2 border-neutral-900 bg-white p-6 text-center shadow-sm print:border print:shadow-none">
        <p className="text-[11px] font-semibold tracking-wider text-neutral-600 uppercase">
          IFPE Campus Belo Jardim — Coordenação
        </p>

        <div
          className="my-4 flex items-center justify-center"
          aria-label={`QR Code do equipamento ${codigo}`}
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />

        <p className="font-mono text-2xl font-bold tracking-wider text-neutral-900">
          {codigo}
        </p>
        <h1 className="mt-1 text-base font-semibold text-neutral-900">
          {equipamento.nome}
        </h1>
        <p className="mt-0.5 text-xs text-neutral-600">
          {equipamento.categoria.nome} • {equipamento.localizacao}
        </p>
      </section>
    </main>
  );
}
