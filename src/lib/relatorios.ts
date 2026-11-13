import type { MovimentacaoTipoEvento, Prisma } from "@prisma/client";
import { TIPO_EVENTO_LABEL } from "./equipamento-labels";
import { formatarDetalhesMovimentacao } from "./historico";

const VALID_TIPOS_EVENTO = new Set<MovimentacaoTipoEvento>([
  "CADASTRO",
  "SINCRONIZACAO_PLANILHA",
  "RETIRADA",
  "DEVOLUCAO",
  "OCORRENCIA",
  "REPOSICAO",
]);

export interface RelatorioFiltro {
  dataInicio?: Date;
  dataFim?: Date;
  tipoEvento?: MovimentacaoTipoEvento;
  q: string;
  page: number;
  pageSize: number;
}

function parseDateParam(raw: string | null, endOfDay: boolean): Date | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    const check = new Date(Date.UTC(year, month - 1, day));
    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() !== month - 1 ||
      check.getUTCDate() !== day
    ) {
      return undefined;
    }

    const iso = endOfDay
      ? `${trimmed}T23:59:59.999-03:00`
      : `${trimmed}T00:00:00.000-03:00`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }

  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function parseRelatorioFiltro(
  searchParams: URLSearchParams
): RelatorioFiltro {
  const dataInicio = parseDateParam(searchParams.get("dataInicio"), false);
  const dataFim = parseDateParam(searchParams.get("dataFim"), true);

  const rawTipo = searchParams.get("tipoEvento")?.trim() ?? "";
  const tipoEvento = VALID_TIPOS_EVENTO.has(rawTipo as MovimentacaoTipoEvento)
    ? (rawTipo as MovimentacaoTipoEvento)
    : undefined;

  const q = searchParams.get("q")?.trim() ?? "";

  const rawPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const rawPageSize = Number.parseInt(
    searchParams.get("pageSize") ?? "20",
    10
  );
  const pageSize = Number.isFinite(rawPageSize)
    ? Math.min(100, Math.max(1, rawPageSize))
    : 20;

  return { dataInicio, dataFim, tipoEvento, q, page, pageSize };
}

export function buildRelatorioWhere(
  filtro: Pick<RelatorioFiltro, "dataInicio" | "dataFim" | "tipoEvento" | "q">
): Prisma.MovimentacaoWhereInput {
  const ocorridoEm: Prisma.DateTimeFilter = {};
  if (filtro.dataInicio) ocorridoEm.gte = filtro.dataInicio;
  if (filtro.dataFim) ocorridoEm.lte = filtro.dataFim;

  return {
    ...(filtro.tipoEvento ? { tipoEvento: filtro.tipoEvento } : {}),
    ...(filtro.dataInicio || filtro.dataFim ? { ocorridoEm } : {}),
    ...(filtro.q
      ? {
          OR: [
            { equipamento: { nome: { contains: filtro.q, mode: "insensitive" } } },
            {
              equipamento: {
                codigoPatrimonio: { contains: filtro.q, mode: "insensitive" },
              },
            },
            {
              equipamento: {
                codigoInterno: { contains: filtro.q, mode: "insensitive" },
              },
            },
            { responsavel: { nome: { contains: filtro.q, mode: "insensitive" } } },
            {
              responsavel: {
                matricula: { contains: filtro.q, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };
}

export interface RelatorioMovimentacaoRow {
  id: string;
  ocorridoEm: Date;
  tipoEvento: MovimentacaoTipoEvento;
  registradoPor: string;
  detalhes: unknown;
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

export const CSV_RELATORIO_HEADERS = [
  "ID",
  "Data/Hora",
  "Evento",
  "Equipamento",
  "Código",
  "Responsável",
  "Matrícula",
  "Detalhes",
  "Registrado por",
] as const;

const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

/**
 * Escapes a CSV cell per RFC 4180 and neutralizes spreadsheet formula injection.
 */
export function csvEscapeCell(value: string | null | undefined): string {
  const raw = value ?? "";
  const safe = FORMULA_PREFIX_RE.test(raw) ? `'${raw}` : raw;
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replaceAll('"', '""')}"`;
  }
  return safe;
}

function formatDataHoraCsv(date: Date): string {
  return date
    .toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "America/Recife",
    })
    .replace(",", "");
}

export function formatMovimentacaoCsvRow(row: RelatorioMovimentacaoRow): string {
  const codigo =
    row.equipamento?.codigoPatrimonio ?? row.equipamento?.codigoInterno ?? "";
  const detalhes = formatarDetalhesMovimentacao(row.tipoEvento, row.detalhes);

  const cells = [
    row.id,
    formatDataHoraCsv(row.ocorridoEm),
    TIPO_EVENTO_LABEL[row.tipoEvento],
    row.equipamento?.nome ?? "",
    codigo,
    row.responsavel?.nome ?? "",
    row.responsavel?.matricula ?? "",
    detalhes,
    row.registradoPor,
  ];

  return cells.map(csvEscapeCell).join(",");
}

/**
 * Streams UTF-8 BOM + CSV rows in bounded batches using cursor pagination.
 */
export function gerarCsvStream({
  batchSize = 500,
  fetchBatch,
}: {
  batchSize?: number;
  fetchBatch: (
    cursorId: string | undefined,
    take: number
  ) => Promise<RelatorioMovimentacaoRow[]>;
}): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let cursorId: string | undefined;
  let sentHeader = false;
  let done = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (done) {
        controller.close();
        return;
      }

      if (!sentHeader) {
        sentHeader = true;
        const headerLine = `\uFEFF${CSV_RELATORIO_HEADERS.join(",")}\r\n`;
        controller.enqueue(encoder.encode(headerLine));
      }

      const batch = await fetchBatch(cursorId, batchSize);
      if (batch.length === 0) {
        done = true;
        controller.close();
        return;
      }

      const chunk = `${batch.map(formatMovimentacaoCsvRow).join("\r\n")}\r\n`;
      controller.enqueue(encoder.encode(chunk));
      cursorId = batch[batch.length - 1].id;

      if (batch.length < batchSize) {
        done = true;
        controller.close();
      }
    },
  });
}
