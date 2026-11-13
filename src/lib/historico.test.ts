import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  formatarDetalhesMovimentacao,
  listarHistorico,
  parseHistoricoFiltro,
  type HistoricoRepo,
} from "./historico";

describe("parseHistoricoFiltro", () => {
  it("applies defaults and clamps page and pageSize", () => {
    const empty = parseHistoricoFiltro(new URLSearchParams());
    expect(empty).toEqual({
      tipoEvento: undefined,
      page: 1,
      pageSize: 20,
    });

    const clamped = parseHistoricoFiltro(
      new URLSearchParams("page=0&pageSize=999&tipoEvento=RETIRADA")
    );
    expect(clamped).toEqual({
      tipoEvento: "RETIRADA",
      page: 1,
      pageSize: 50,
    });
  });

  it("ignores invalid tipoEvento values", () => {
    const parsed = parseHistoricoFiltro(
      new URLSearchParams("tipoEvento=INVALIDO&page=2&pageSize=10")
    );
    expect(parsed).toEqual({
      tipoEvento: undefined,
      page: 2,
      pageSize: 10,
    });
  });
});

describe("formatarDetalhesMovimentacao", () => {
  it("formats RETIRADA and DEVOLUCAO details into readable Portuguese text", () => {
    const retirada = formatarDetalhesMovimentacao("RETIRADA", {
      motivo: "Aula de Redes",
      previsaoDevolucao: "2026-11-15T18:00:00.000Z",
    });
    expect(retirada).toContain("Motivo: Aula de Redes");

    const devolucao = formatarDetalhesMovimentacao("DEVOLUCAO", {
      condicaoDevolucao: "DANIFICADO",
      statusDestino: "EM_MANUTENCAO",
    });
    expect(devolucao).toContain("Danificado");
    expect(devolucao).toContain("Em manutenção");
  });
});

describe("listarHistorico", () => {
  it("returns paginated timeline items with readable event labels", async () => {
    const repo: HistoricoRepo = {
      countMovimentacoes: vi.fn(async () => 25),
      findMovimentacoes: vi.fn(async () => [
        {
          id: "mov-1",
          tipoEvento: "RETIRADA" as const,
          detalhes: { motivo: "Oficina", previsaoDevolucao: null },
          registradoPor: "Coordenação",
          ocorridoEm: new Date("2026-11-13T14:00:00.000Z"),
          equipamento: {
            id: "eq-1",
            nome: "Notebook Dell",
            codigoPatrimonio: "PAT-001",
            codigoInterno: null,
          },
          responsavel: {
            id: "resp-1",
            nome: "Ana Silva",
            matricula: "2026001",
          },
        },
      ]),
    };

    const res = await listarHistorico(
      { equipamentoId: "eq-1", page: 2, pageSize: 10 },
      { repo }
    );

    expect(repo.findMovimentacoes).toHaveBeenCalledWith({
      equipamentoId: "eq-1",
      responsavelId: undefined,
      tipoEvento: undefined,
      skip: 10,
      take: 10,
    });
    expect(res.total).toBe(25);
    expect(res.page).toBe(2);
    expect(res.totalPages).toBe(3);
    expect(res.items[0]).toMatchObject({
      id: "mov-1",
      tipoEvento: "RETIRADA",
      tipoEventoLabel: "Retirada",
      registradoPor: "Coordenação",
      resumoDetalhes: "Motivo: Oficina",
    });
  });
});

describe("immutability of historico routes (read-only)", () => {
  it("exposes only GET handlers and no POST/PUT/PATCH/DELETE handlers on historico routes", () => {
    const routeFiles = [
      path.resolve(
        process.cwd(),
        "src/app/api/equipamentos/[id]/historico/route.ts"
      ),
      path.resolve(
        process.cwd(),
        "src/app/api/responsaveis/[id]/historico/route.ts"
      ),
    ];

    for (const filePath of routeFiles) {
      expect(existsSync(filePath)).toBe(true);
      const source = readFileSync(filePath, "utf8");
      expect(source).toMatch(/export\s+async\s+function\s+GET\b/);
      expect(source).not.toMatch(
        /export\s+(async\s+)?function\s+(POST|PUT|PATCH|DELETE)\b/
      );
    }
  });

  it("enforces insert-only immutability trigger and index on Movimentacao in SQL migration", () => {
    const migrationPath = path.resolve(
      process.cwd(),
      "prisma/migrations/20261113000000_init/migration.sql"
    );
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toContain("Movimentacao_equipamentoId_ocorridoEm_idx");
    expect(sql).toContain("Movimentacao_immutable_guard");
    expect(sql).toMatch(/BEFORE UPDATE OR DELETE ON "Movimentacao"/);
  });
});
