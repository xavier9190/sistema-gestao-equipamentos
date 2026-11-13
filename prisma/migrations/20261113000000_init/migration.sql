-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EquipamentoStatus" AS ENUM ('DISPONIVEL', 'EMPRESTADO', 'EM_MANUTENCAO', 'EXTRAVIADO');

-- CreateEnum
CREATE TYPE "EstadoConservacao" AS ENUM ('BOM', 'REGULAR', 'COM_DEFEITO', 'DANIFICADO');

-- CreateEnum
CREATE TYPE "ResponsavelTipo" AS ENUM ('DOCENTE', 'DISCENTE', 'SERVIDOR');

-- CreateEnum
CREATE TYPE "CondicaoDevolucao" AS ENUM ('BOM_ESTADO', 'COM_DEFEITO', 'DANIFICADO');

-- CreateEnum
CREATE TYPE "OcorrenciaTipo" AS ENUM ('PERDA', 'DANO', 'DEFEITO');

-- CreateEnum
CREATE TYPE "MovimentacaoTipoEvento" AS ENUM ('CADASTRO', 'SINCRONIZACAO_PLANILHA', 'RETIRADA', 'DEVOLUCAO', 'OCORRENCIA', 'REPOSICAO');

-- CreateTable
CREATE TABLE "CoordenacaoUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "tentativasFalhas" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoAte" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoordenacaoUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipamento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigoPatrimonio" TEXT,
    "codigoInterno" TEXT,
    "categoriaId" TEXT NOT NULL,
    "localizacao" TEXT NOT NULL,
    "estadoConservacao" "EstadoConservacao" NOT NULL DEFAULT 'BOM',
    "valorAproximado" DECIMAL(10,2),
    "emprestavel" BOOLEAN NOT NULL DEFAULT true,
    "status" "EquipamentoStatus" NOT NULL DEFAULT 'DISPONIVEL',
    "equipamentoPrincipalId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Responsavel" (
    "id" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "ResponsavelTipo" NOT NULL,
    "contato" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Responsavel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Emprestimo" (
    "id" TEXT NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "retiradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previsaoDevolucao" TIMESTAMP(3),
    "motivo" TEXT NOT NULL,
    "encerradoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Emprestimo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmprestimoItem" (
    "id" TEXT NOT NULL,
    "emprestimoId" TEXT NOT NULL,
    "equipamentoId" TEXT NOT NULL,
    "devolvidoEm" TIMESTAMP(3),
    "condicaoDevolucao" "CondicaoDevolucao",
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmprestimoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ocorrencia" (
    "id" TEXT NOT NULL,
    "equipamentoId" TEXT NOT NULL,
    "emprestimoItemId" TEXT,
    "responsavelId" TEXT,
    "tipo" "OcorrenciaTipo" NOT NULL,
    "descricao" TEXT NOT NULL,
    "deveRepor" BOOLEAN NOT NULL DEFAULT false,
    "reposicaoConcluidaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ocorrencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movimentacao" (
    "id" TEXT NOT NULL,
    "equipamentoId" TEXT,
    "responsavelId" TEXT,
    "tipoEvento" "MovimentacaoTipoEvento" NOT NULL,
    "detalhes" JSONB NOT NULL,
    "registradoPor" TEXT NOT NULL DEFAULT 'Coordenação',
    "ocorridoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movimentacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoordenacaoUser_email_key" ON "CoordenacaoUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nome_key" ON "Categoria"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Equipamento_codigoPatrimonio_key" ON "Equipamento"("codigoPatrimonio");

-- CreateIndex
CREATE UNIQUE INDEX "Equipamento_codigoInterno_key" ON "Equipamento"("codigoInterno");

-- CreateIndex
CREATE INDEX "Equipamento_categoriaId_idx" ON "Equipamento"("categoriaId");

-- CreateIndex
CREATE INDEX "Equipamento_status_idx" ON "Equipamento"("status");

-- CreateIndex
CREATE INDEX "Equipamento_equipamentoPrincipalId_idx" ON "Equipamento"("equipamentoPrincipalId");

-- CreateIndex
CREATE UNIQUE INDEX "Responsavel_matricula_key" ON "Responsavel"("matricula");

-- CreateIndex
CREATE INDEX "Emprestimo_responsavelId_idx" ON "Emprestimo"("responsavelId");

-- CreateIndex
CREATE INDEX "Emprestimo_encerradoEm_previsaoDevolucao_idx" ON "Emprestimo"("encerradoEm", "previsaoDevolucao");

-- CreateIndex
CREATE INDEX "EmprestimoItem_emprestimoId_idx" ON "EmprestimoItem"("emprestimoId");

-- CreateIndex
CREATE INDEX "EmprestimoItem_equipamentoId_idx" ON "EmprestimoItem"("equipamentoId");

-- CreateIndex
CREATE INDEX "Ocorrencia_equipamentoId_idx" ON "Ocorrencia"("equipamentoId");

-- CreateIndex
CREATE INDEX "Ocorrencia_responsavelId_deveRepor_reposicaoConcluidaEm_idx" ON "Ocorrencia"("responsavelId", "deveRepor", "reposicaoConcluidaEm");

-- CreateIndex
CREATE INDEX "Movimentacao_equipamentoId_ocorridoEm_idx" ON "Movimentacao"("equipamentoId", "ocorridoEm");

-- CreateIndex
CREATE INDEX "Movimentacao_responsavelId_ocorridoEm_idx" ON "Movimentacao"("responsavelId", "ocorridoEm");

-- CreateIndex
CREATE INDEX "Movimentacao_tipoEvento_ocorridoEm_idx" ON "Movimentacao"("tipoEvento", "ocorridoEm");

-- AddForeignKey
ALTER TABLE "Equipamento" ADD CONSTRAINT "Equipamento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipamento" ADD CONSTRAINT "Equipamento_equipamentoPrincipalId_fkey" FOREIGN KEY ("equipamentoPrincipalId") REFERENCES "Equipamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emprestimo" ADD CONSTRAINT "Emprestimo_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Responsavel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmprestimoItem" ADD CONSTRAINT "EmprestimoItem_emprestimoId_fkey" FOREIGN KEY ("emprestimoId") REFERENCES "Emprestimo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmprestimoItem" ADD CONSTRAINT "EmprestimoItem_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ocorrencia" ADD CONSTRAINT "Ocorrencia_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ocorrencia" ADD CONSTRAINT "Ocorrencia_emprestimoItemId_fkey" FOREIGN KEY ("emprestimoItemId") REFERENCES "EmprestimoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ocorrencia" ADD CONSTRAINT "Ocorrencia_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Responsavel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Responsavel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Custom domain constraints (SPEC.md & ADR-0003)

-- 1. Equipamento must have at least one non-empty identifier (codigoPatrimonio or codigoInterno)
ALTER TABLE "Equipamento"
  ADD CONSTRAINT "Equipamento_codigo_identificador_check"
  CHECK (
    NULLIF(BTRIM("codigoPatrimonio"), '') IS NOT NULL
    OR NULLIF(BTRIM("codigoInterno"), '') IS NOT NULL
  );

-- 1b. Enforce single shared Coordenação account (ADR-0001)
CREATE UNIQUE INDEX "CoordenacaoUser_singleton_unique"
  ON "CoordenacaoUser"((true));

-- 2. Partial unique index preventing concurrent double-lending of the same Equipamento
CREATE UNIQUE INDEX "EmprestimoItem_equipamento_ativo_unique"
  ON "EmprestimoItem"("equipamentoId")
  WHERE "devolvidoEm" IS NULL;

-- 3. Immutability trigger on Movimentacao (append-only audit trail)
CREATE OR REPLACE FUNCTION prevent_movimentacao_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Movimentacao records are immutable and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Movimentacao_immutable_guard"
  BEFORE UPDATE OR DELETE ON "Movimentacao"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_movimentacao_mutation();
