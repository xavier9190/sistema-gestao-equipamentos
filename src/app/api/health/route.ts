import { NextResponse } from "next/server";
import { checkHealth } from "@/lib/health";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await checkHealth({
    pingDatabase: async () => {
      await prisma.$queryRaw`SELECT 1`;
    },
    logger,
  });

  return NextResponse.json(result.body, { status: result.httpStatus });
}
