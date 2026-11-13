import { describe, expect, it } from "vitest";
import { calcularStatusEmprestimo } from "./emprestimo-status";

describe("calcularStatusEmprestimo", () => {
  const now = new Date("2026-11-13T12:00:00.000Z");

  it("returns ENCERRADO when encerradoEm is set, even if previsaoDevolucao is in the past", () => {
    const status = calcularStatusEmprestimo(
      {
        encerradoEm: new Date("2026-11-10T10:00:00.000Z"),
        previsaoDevolucao: new Date("2026-11-09T10:00:00.000Z"),
        itens: [{ devolvidoEm: null }],
      },
      now
    );

    expect(status).toBe("ENCERRADO");
  });

  it("returns ENCERRADO when all items have devolvidoEm set", () => {
    const status = calcularStatusEmprestimo(
      {
        encerradoEm: null,
        previsaoDevolucao: new Date("2026-11-09T10:00:00.000Z"),
        itens: [
          { devolvidoEm: new Date("2026-11-09T09:00:00.000Z") },
          { devolvidoEm: new Date("2026-11-09T09:30:00.000Z") },
        ],
      },
      now
    );

    expect(status).toBe("ENCERRADO");
  });

  it("returns ATRASADO when open and now is strictly after previsaoDevolucao", () => {
    const status = calcularStatusEmprestimo(
      {
        encerradoEm: null,
        previsaoDevolucao: new Date("2026-11-13T11:59:59.000Z"),
        itens: [
          { devolvidoEm: new Date("2026-11-13T10:00:00.000Z") },
          { devolvidoEm: null },
        ],
      },
      now
    );

    expect(status).toBe("ATRASADO");
  });

  it("returns EM_ABERTO when open and previsaoDevolucao is null or in the future", () => {
    expect(
      calcularStatusEmprestimo(
        {
          encerradoEm: null,
          previsaoDevolucao: null,
          itens: [{ devolvidoEm: null }],
        },
        now
      )
    ).toBe("EM_ABERTO");

    expect(
      calcularStatusEmprestimo(
        {
          encerradoEm: null,
          previsaoDevolucao: now,
          itens: [{ devolvidoEm: null }],
        },
        now
      )
    ).toBe("EM_ABERTO");
  });
});
