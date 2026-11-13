import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  criarResponsavel,
  parseResponsavelFiltros,
  ResponsavelError,
} from "@/lib/responsavel";
import {
  listarResponsaveisComPendencias,
  responsavelPrismaRepo,
} from "@/lib/responsavel-prisma";

export const dynamic = "force-dynamic";

const responsavelBodySchema = z.object({
  matricula: z.string().trim().min(1, "Matrícula é obrigatória."),
  nome: z.string().trim().min(1, "Nome é obrigatório."),
  tipo: z.enum(["DOCENTE", "DISCENTE", "SERVIDOR"]),
  contato: z.string().trim().min(1, "Contato é obrigatório."),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filtros = parseResponsavelFiltros({
    q: searchParams.get("q") ?? undefined,
    tipo: searchParams.get("tipo") ?? undefined,
    ativo: searchParams.get("ativo") ?? undefined,
  });

  const responsaveis = await listarResponsaveisComPendencias(filtros);

  return NextResponse.json({ responsaveis }, { status: 200 });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }

  const parsed = responsavelBodySchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Dados inválidos.";
    return NextResponse.json(
      { ok: false, message: firstIssue },
      { status: 400 }
    );
  }

  try {
    const responsavel = await criarResponsavel(parsed.data, {
      repo: responsavelPrismaRepo,
    });

    logger.info("responsavel.created", {
      responsavelId: responsavel.id,
      matricula: responsavel.matricula,
      tipo: responsavel.tipo,
    });

    return NextResponse.json(
      { ok: true, responsavel },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof ResponsavelError) {
      return NextResponse.json(
        { ok: false, message: err.message },
        { status: err.httpStatus }
      );
    }

    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "Já existe um responsável cadastrado com esta matrícula.",
        },
        { status: 409 }
      );
    }

    logger.error("responsavel.create.error", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { ok: false, message: "Erro interno ao cadastrar responsável." },
      { status: 500 }
    );
  }
}
