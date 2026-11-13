-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmprestimoItem_emprestimoId_devolvidoEm_idx"
ON "EmprestimoItem"("emprestimoId", "devolvidoEm");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmprestimoItem_equipamentoId_devolvidoEm_idx"
ON "EmprestimoItem"("equipamentoId", "devolvidoEm");

-- CreateView: situação consolidada dos equipamentos com status derivado de atraso
CREATE OR REPLACE VIEW "vw_situacao_equipamentos" AS
SELECT
  e."id" AS "equipamentoId",
  e."nome" AS "equipamentoNome",
  e."codigoPatrimonio",
  e."codigoInterno",
  e."localizacao",
  e."status" AS "statusEquipamento",
  CASE
    WHEN e."status" = 'EMPRESTADO'
      AND emp."id" IS NOT NULL
      AND emp."previsaoDevolucao" IS NOT NULL
      AND emp."previsaoDevolucao" < (NOW() AT TIME ZONE 'UTC')
      THEN 'ATRASADO'
    ELSE e."status"::text
  END AS "situacaoDerivada",
  emp."id" AS "emprestimoId",
  emp."retiradoEm",
  emp."previsaoDevolucao",
  r."id" AS "responsavelId",
  r."nome" AS "responsavelNome",
  r."matricula" AS "responsavelMatricula"
FROM "Equipamento" e
LEFT JOIN "EmprestimoItem" ei
  ON ei."equipamentoId" = e."id"
  AND ei."devolvidoEm" IS NULL
LEFT JOIN "Emprestimo" emp
  ON emp."id" = ei."emprestimoId"
  AND emp."encerradoEm" IS NULL
LEFT JOIN "Responsavel" r
  ON r."id" = emp."responsavelId";
