import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../src/lib/seed.ts";

const prisma = new PrismaClient();

async function main() {
  const result = await seedDatabase(prisma);
  console.log(
    `Seed concluído: ${result.categoriasCount} categorias e conta Coordenação (${result.coordenacaoEmail}).`
  );
}

main()
  .catch((error) => {
    console.error("Erro ao executar seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
