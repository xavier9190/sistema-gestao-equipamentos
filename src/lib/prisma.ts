import { PrismaClient } from "@prisma/client";
import { movimentacaoQueryGuard } from "./prisma-guards";

function createPrismaClient() {
  return new PrismaClient().$extends({
    query: {
      movimentacao: {
        $allOperations({ operation, args, query }) {
          return movimentacaoQueryGuard({ operation, args, query });
        },
      },
    },
  });
}

export type AppPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: AppPrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
