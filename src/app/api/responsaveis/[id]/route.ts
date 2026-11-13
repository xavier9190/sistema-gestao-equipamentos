import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  alterarStatusResponsavel,
  atualizarResponsavel,
  ResponsavelError,
} from "@/lib/responsavel";
import { responsavelPrismaRepo } from "@/lib/responsavel-prisma";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  matricula: z.string().trim().min(1, "Matrícula é obrigatória."),
  nome: z.string().trim().min(1, "Nome é obrigatório."),
  tipo: z.enum(["DOCENTE", "DISCENTE", "SERVIDOR"]),
  contato: z.string().trim().min(1, "Contato é obrigatório."),
});

const statusSchema = z.object({
  ativo: z.boolean(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const responsavel = await responsavelPrismaRepo.findById(id);

  if (!responsavel) {
    return NextResponse.json(
      { ok: false, message: "Responsável não encontrado." },
      { status: 404 }
    );
  }

  return NextResponse.json({ responsavel }, { status: 200 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }

  try {
    const statusParsed = statusSchema.safeParse(body);
    if (
      statusParsed.success &&
      typeof body === "object" &&
      body !== null &&
      Object.keys(body).length === 1
    ) {
      const responsavel = await alterarStatusResponsavel(
        id,
        statusParsed.data.ativo,
        { repo: responsavelPrismaRepo }
      );
      return NextResponse.json({ ok: true, responsavel }, { status: 200 });
    }

    const updateParsed = updateSchema.safeParse(body);
    if (!updateParsed.success) {
      const firstIssue =
        updateParsed.error.issues[0]?.message ?? "Dados inválidos.";
      return NextResponse.json(
        { ok: false, message: firstIssue },
        { status: 400 }
      );
    }

    const responsavel = await atualizarResponsavel(id, updateParsed.data, {
      repo: responsavelPrismaRepo,
    });
    return NextResponse.json({ ok: true, responsavel }, { status: 200 });
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

    return NextResponse.json(
      { ok: false, message: "Erro interno ao atualizar responsável." },
      { status: 500 }
    );
  }
}
