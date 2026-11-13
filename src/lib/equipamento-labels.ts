import type {
  EquipamentoStatus,
  EstadoConservacao,
  MovimentacaoTipoEvento,
} from "@prisma/client";

export const STATUS_EQUIPAMENTO_UI: Record<
  EquipamentoStatus,
  { label: string; className: string }
> = {
  DISPONIVEL: {
    label: "Disponível",
    className: "bg-emerald-50 text-emerald-800",
  },
  EMPRESTADO: {
    label: "Emprestado",
    className: "bg-blue-50 text-blue-800",
  },
  EM_MANUTENCAO: {
    label: "Em manutenção",
    className: "bg-amber-50 text-amber-900",
  },
  EXTRAVIADO: {
    label: "Extraviado",
    className: "bg-red-50 text-red-800",
  },
};

export const ESTADO_CONSERVACAO_LABEL: Record<EstadoConservacao, string> = {
  BOM: "Bom",
  REGULAR: "Regular",
  COM_DEFEITO: "Com defeito",
  DANIFICADO: "Danificado",
};

export const TIPO_EVENTO_LABEL: Record<MovimentacaoTipoEvento, string> = {
  CADASTRO: "Cadastro",
  SINCRONIZACAO_PLANILHA: "Sincronização de planilha",
  RETIRADA: "Retirada",
  DEVOLUCAO: "Devolução",
  OCORRENCIA: "Ocorrência",
  REPOSICAO: "Reposição",
};
