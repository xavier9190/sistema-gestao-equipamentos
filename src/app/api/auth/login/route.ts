import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateCoordenacao } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  buildSessionCookieOptions,
  createSessionToken,
  DEFAULT_SESSION_TTL_SECONDS,
  SESSION_COOKIE_NAME,
} from "@/lib/session";

const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe a senha."),
});

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

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Informe e-mail e senha válidos." },
      { status: 400 }
    );
  }

  const result = await authenticateCoordenacao(parsed.data, {
    repo: {
      findByEmail: (email) =>
        prisma.coordenacaoUser.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            senhaHash: true,
            tentativasFalhas: true,
            bloqueadoAte: true,
          },
        }),
      updateLoginState: async (id, data) => {
        await prisma.coordenacaoUser.update({
          where: { id },
          data,
        });
      },
    },
    logger,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: result.message,
        ...(result.bloqueadoAte
          ? { bloqueadoAte: result.bloqueadoAte.toISOString() }
          : {}),
      },
      { status: result.httpStatus }
    );
  }

  const token = await createSessionToken({
    userId: result.user.id,
    email: result.user.email,
  });

  const response = NextResponse.json(
    { ok: true, user: result.user },
    { status: 200 }
  );
  response.cookies.set(
    SESSION_COOKIE_NAME,
    token,
    buildSessionCookieOptions(DEFAULT_SESSION_TTL_SECONDS)
  );

  return response;
}
