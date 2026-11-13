import type { EquipamentoStatus, MovimentacaoTipoEvento } from "@prisma/client";
import { STATUS_EQUIPAMENTO_UI, TIPO_EVENTO_LABEL } from "./equipamento-labels";

const VALID_TIPOS_EVENTO = new Set<MovimentacaoTipoEvento>([
  "CADASTRO",
  "SINCRONIZACAO_PLANILHA",
  "RETIRADA",
  "DEVOLUCAO",
  "OCORRENCIA",
  "REPOSICAO",
]);

const CONDICAO_LABEL: Record<string, string> = {
  BOM_ESTADO: "Bom estado",
  COM_DEFEITO: "Com defeito",
  DANIFICADO: "Danificado",
};

export interface HistoricoFiltro {
  tipoEvento: MovimentacaoTipoEvento | undefined;
  page: number;
  pageSize: number;
}

export function parseHistoricoFiltro(
  searchParams: URLSearchParams
): HistoricoFiltro {
  const rawTipo = searchParams.get("tipoEvento")?.trim() ?? "";
  const tipoEvento = VALID_TIPOS_EVENTO.has(rawTipo as MovimentacaoTipoEvento)
    ? (rawTipo as MovimentacaoTipoEvento)
    : undefined;

  const rawPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const rawPageSize = Number.parseInt(
    searchParams.get("pageSize") ?? "20",
    10
  );
  const pageSize = Number.isFinite(rawPageSize)
    ? Math.min(50, Math.max(1, rawPageSize))
    : 20;

  return { tipoEvento, page, pageSize };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function formatIsoShort(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Recife",
  });
}

export function formatarDetalhesMovimentacao(
  tipoEvento: MovimentacaoTipoEvento,
  detalhes: unknown
): string {
  const obj = asRecord(detalhes);

  switch (tipoEvento) {
    case "RETIRADA": {
      const parts: string[] = [];
      if (typeof obj.motivo === "string" && obj.motivo.trim()) {
        parts.push(`Motivo: ${obj.motivo.trim()}`);
      }
      const prev = formatIsoShort(obj.previsaoDevolucao);
      if (prev) {
        parts.push(`Previsão: ${prev}`);
      }
      return parts.join(" · ") || "Retirada registrada";
    }
    case "DEVOLUCAO": {
      const parts: string[] = [];
      if (typeof obj.condicaoDevolucao === "string") {
        parts.push(
          `Condição: ${CONDICAO_LABEL[obj.condicaoDevolucao] ?? obj.condicaoDevolucao}`
        );
      }
      if (typeof obj.statusDestino === "string") {
        const statusInfo =
          STATUS_EQUIPAMENTO_UI[obj.statusDestino as EquipamentoStatus];
        parts.push(
          `Destino: ${statusInfo ? statusInfo.label : obj.statusDestino}`
        );
      }
      return parts.join(" · ") || "Devolução registrada";
    }
    case "CADASTRO": {
      if (typeof obj.codigoInterno === "string" && obj.codigoInterno) {
        return `Item cadastrado (${obj.codigoInterno})`;
      }
      return "Item cadastrado no acervo";
    }
    case "SINCRONIZACAO_PLANILHA":
      return "Sincronizado com planilha";
    case "OCORRENCIA": {
      if (typeof obj.descricao === "string" && obj.descricao.trim()) {
        return obj.descricao.trim();
      }
      return "Ocorrência registrada";
    }
    case "REPOSICAO":
      return "Reposição / retorno da manutenção concluído";
  }
}

export interface MovimentacaoRawRecord {
  id: string;
  tipoEvento: MovimentacaoTipoEvento;
  detalhes: unknown;
  registradoPor: string;
  ocorridoEm: Date;
  equipamento: {
    id: string;
    nome: string;
    codigoPatrimonio: string | null;
    codigoInterno: string | null;
  } | null;
  responsavel: {
    id: string;
    nome: string;
    matricula: string;
  } | null;
}

export interface HistoricoItemDTO {
  id: string;
  tipoEvento: MovimentacaoTipoEvento;
  tipoEventoLabel: string;
  resumoDetalhes: string;
  registradoPor: string;
  ocorridoEm: string;
  equipamento: {
    id: string;
    nome: string;
    codigoPatrimonio: string | null;
    codigoInterno: string | null;
  } | null;
  responsavel: {
    id: string;
    nome: string;
    matricula: string;
  } | null;
}

export interface HistoricoRepo {
  countMovimentacoes: (query: {
    equipamentoId?: string;
    responsavelId?: string;
    tipoEvento?: MovimentacaoTipoEvento;
  }) => Promise<number>;
  findMovimentacoes: (query: {
    equipamentoId?: string;
    responsavelId?: string;
    tipoEvento?: MovimentacaoTipoEvento;
    skip: number;
    take: number;
  }) => Promise<MovimentacaoRawRecord[]>;
}

/**
 * Queries immutable Movimentacao records for an equipment item or responsible person,
 * returning paginated items with human-readable event labels and summaries.
 */
export async function listarHistorico(
  input: {
    equipamentoId?: string;
    responsavelId?: string;
    tipoEvento?: MovimentacaoTipoEvento;
    page: number;
    pageSize: number;
  },
  { repo }: { repo: HistoricoRepo }
) {
  const skip = (input.page - 1) * input.pageSize;
  const filter = {
    equipamentoId: input.equipamentoId,
    responsavelId: input.responsavelId,
    tipoEvento: input.tipoEvento,
  };

  const [total, rows] = await Promise.all([
    repo.countMovimentacoes(filter),
    repo.findMovimentacoes({ ...filter, skip, take: input.pageSize }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
  const items: HistoricoItemDTO[] = rows.map((row) => ({
    id: row.id,
    tipoEvento: row.tipoEvento,
    tipoEventoLabel: TIPO_EVENTO_LABEL[row.tipoEvento],
    resumoDetalhes: formatarDetalhesMovimentacao(row.tipoEvento, row.detalhes),
    registradoPor: row.registradoPor,
    ocorridoEm: row.ocorridoEm.toISOString(),
    equipamento: row.equipamento,
    responsavel: row.responsavel,
  }));

  return {
    items,
    total,
    page: input.page,
    pageSize: input.pageSize,
    totalPages,
  };
}
