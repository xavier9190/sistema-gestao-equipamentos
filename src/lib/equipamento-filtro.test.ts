import { describe, expect, it } from "vitest";
import {
  buildEquipamentoWhere,
  parseEquipamentoFiltros,
} from "./equipamento-filtro";

describe("parseEquipamentoFiltros", () => {
  it("normalizes query parameters and ignores invalid status or emprestavel values", () => {
    const filtros = parseEquipamentoFiltros({
      q: "  notebook  ",
      categoriaId: " cat-1 ",
      status: "INVALIDO",
      localizacao: "  Sala 12 ",
      emprestavel: "talvez",
    });

    expect(filtros).toEqual({
      q: "notebook",
      categoriaId: "cat-1",
      status: undefined,
      localizacao: "Sala 12",
      emprestavel: undefined,
    });
  });

  it("parses valid status and boolean emprestavel values", () => {
    expect(
      parseEquipamentoFiltros({
        status: "EM_MANUTENCAO",
        emprestavel: "false",
      })
    ).toEqual({
      q: undefined,
      categoriaId: undefined,
      status: "EM_MANUTENCAO",
      localizacao: undefined,
      emprestavel: false,
    });

    expect(parseEquipamentoFiltros({ emprestavel: "true" }).emprestavel).toBe(
      true
    );
  });
});

describe("buildEquipamentoWhere", () => {
  it("returns an empty where clause when no filters are active", () => {
    expect(buildEquipamentoWhere({})).toEqual({});
  });

  it("builds OR search on nome, codigoPatrimonio, and codigoInterno plus exact/contains filters", () => {
    const where = buildEquipamentoWhere({
      q: "INT-0012",
      categoriaId: "cat-chave",
      status: "DISPONIVEL",
      localizacao: "Coordenação",
      emprestavel: true,
    });

    expect(where).toEqual({
      OR: [
        { nome: { contains: "INT-0012", mode: "insensitive" } },
        { codigoPatrimonio: { contains: "INT-0012", mode: "insensitive" } },
        { codigoInterno: { contains: "INT-0012", mode: "insensitive" } },
      ],
      categoriaId: "cat-chave",
      status: "DISPONIVEL",
      localizacao: { contains: "Coordenação", mode: "insensitive" },
      emprestavel: true,
    });
  });
});
