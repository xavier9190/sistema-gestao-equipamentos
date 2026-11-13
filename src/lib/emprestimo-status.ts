export type StatusEmprestimoDerivado = "ENCERRADO" | "ATRASADO" | "EM_ABERTO";

export interface EmprestimoParaStatus {
  encerradoEm: Date | null;
  previsaoDevolucao: Date | null;
  itens?: ReadonlyArray<{ devolvidoEm: Date | null }>;
}

/**
 * Derives the current loan state from closure timestamp, item returns, and due date (ADR-0003).
 */
export function calcularStatusEmprestimo(
  emprestimo: EmprestimoParaStatus,
  now: Date = new Date()
): StatusEmprestimoDerivado {
  const todosItensDevolvidos =
    emprestimo.itens !== undefined &&
    emprestimo.itens.length > 0 &&
    emprestimo.itens.every((item) => item.devolvidoEm !== null);

  if (emprestimo.encerradoEm !== null || todosItensDevolvidos) {
    return "ENCERRADO";
  }

  if (
    emprestimo.previsaoDevolucao !== null &&
    now.getTime() > emprestimo.previsaoDevolucao.getTime()
  ) {
    return "ATRASADO";
  }

  return "EM_ABERTO";
}
