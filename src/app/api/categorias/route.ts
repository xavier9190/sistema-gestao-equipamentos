import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const categorias = await prisma.categoria.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, descricao: true },
  });

  return NextResponse.json({ categorias }, { status: 200 });
}
