import { describe, expect, it } from "vitest";
import {
  CSV_RELATORIO_HEADERS,
  csvEscapeCell,
  formatMovimentacaoCsvRow,
  gerarCsvStream,
  parseRelatorioFiltro,
  type RelatorioMovimentacaoRow,
} from "./relatorios";

function makeRow(index: number): RelatorioMovimentacaoRow {
  return {
    id: `mov-${index}`,
    ocorridoEm: new Date("2026-11-13T15:30:00.000Z"),
    tipoEvento: "RETIRADA",
    registradoPor: "Coordenação",
    detalhes: { motivo: `Aula prática #${index}` },
    equipamento: {
      id: `eq-${index}`,
      nome: `Notebook ${index}`,
      codigoPatrimonio: `PAT-${index}`,
      codigoInterno: null,
    },
    responsavel: {
      id: `resp-${index}`,
      nome: "Ana Silva",
      matricula: "2026001",
    },
  };
}

describe("parseRelatorioFiltro", () => {
  it("parses date range (inclusive end of day), tipoEvento, q, and pagination", () => {
    const parsed = parseRelatorioFiltro(
      new URLSearchParams(
        "dataInicio=2026-11-01&dataFim=2026-11-13&tipoEvento=DEVOLUCAO&q=Dell&page=2&pageSize=25"
      )
    );

    expect(parsed.dataInicio?.toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(parsed.dataFim?.toISOString()).toBe("2026-11-14T02:59:59.999Z");
    expect(parsed.tipoEvento).toBe("DEVOLUCAO");
    expect(parsed.q).toBe("Dell");
    expect(parsed.page).toBe(2);
    expect(parsed.pageSize).toBe(25);
  });

  it("ignores invalid dates, calendar rollovers, and invalid tipoEvento", () => {
    const parsed = parseRelatorioFiltro(
      new URLSearchParams(
        "dataInicio=not-a-date&dataFim=2026-02-31&tipoEvento=BAD&page=-3"
      )
    );
    expect(parsed.dataInicio).toBeUndefined();
    expect(parsed.dataFim).toBeUndefined();
    expect(parsed.tipoEvento).toBeUndefined();
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(20);
  });
});

describe("CSV formatting and columns", () => {
  it("exposes expected audit columns and escapes commas, quotes, newlines, and formula prefixes", () => {
    expect(CSV_RELATORIO_HEADERS).toEqual([
      "ID",
      "Data/Hora",
      "Evento",
      "Equipamento",
      "Código",
      "Responsável",
      "Matrícula",
      "Detalhes",
      "Registrado por",
    ]);

    expect(csvEscapeCell('Item "A", Sala 2')).toBe('"Item ""A"", Sala 2"');
    expect(csvEscapeCell("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
    expect(csvEscapeCell("+cmd|'/C calc'!A0")).toBe("'+cmd|'/C calc'!A0");

    const rowCsv = formatMovimentacaoCsvRow(makeRow(1));
    const cols = rowCsv.split(",");
    expect(cols).toHaveLength(CSV_RELATORIO_HEADERS.length);
    expect(cols[0]).toBe("mov-1");
    expect(cols[2]).toBe("Retirada");
    expect(cols[3]).toBe("Notebook 1");
    expect(cols[4]).toBe("PAT-1");
    expect(cols[5]).toBe("Ana Silva");
    expect(cols[6]).toBe("2026001");
    expect(cols[8]).toBe("Coordenação");
  });
});

describe("gerarCsvStream (high volume)", () => {
  it("streams 2500 records across multiple batches with BOM and exact row count", async () => {
    const totalRecords = 2500;
    const allRows: RelatorioMovimentacaoRow[] = Array.from(
      { length: totalRecords },
      (_, i) => makeRow(i + 1)
    );

    let batchCalls = 0;
    const stream = gerarCsvStream({
      batchSize: 500,
      fetchBatch: async (cursorId, take) => {
        batchCalls += 1;
        const startIdx = cursorId
          ? allRows.findIndex((r) => r.id === cursorId) + 1
          : 0;
        return allRows.slice(startIdx, startIdx + take);
      },
    });

    const buf = new Uint8Array(await new Response(stream).arrayBuffer());
    expect(Array.from(buf.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder().decode(buf.slice(3));
    const lines = text.trimEnd().split("\r\n");
    expect(lines).toHaveLength(totalRecords + 1);
    expect(lines[0]).toBe(CSV_RELATORIO_HEADERS.join(","));
    expect(batchCalls).toBeGreaterThanOrEqual(5);
  });
});
