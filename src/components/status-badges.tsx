import type { EquipamentoStatus } from "@prisma/client";
import type { StatusEmprestimoDerivado } from "@/lib/emprestimo-status";

const EQUIPAMENTO_STATUS_CONFIG: Record<
  EquipamentoStatus,
  { label: string; className: string }
> = {
  DISPONIVEL: {
    label: "Disponível",
    className: "bg-emerald-100 text-emerald-800",
  },
  EMPRESTADO: {
    label: "Emprestado",
    className: "bg-blue-100 text-blue-800",
  },
  EM_MANUTENCAO: {
    label: "Em manutenção",
    className: "bg-amber-100 text-amber-800",
  },
  EXTRAVIADO: {
    label: "Extraviado",
    className: "bg-red-100 text-red-800",
  },
};

const EMPRESTIMO_STATUS_CONFIG: Record<
  StatusEmprestimoDerivado,
  { label: string; className: string }
> = {
  EM_ABERTO: {
    label: "Em aberto",
    className: "bg-blue-100 text-blue-800",
  },
  ATRASADO: {
    label: "Atrasado",
    className: "bg-red-100 text-red-800",
  },
  ENCERRADO: {
    label: "Encerrado",
    className: "bg-neutral-200 text-neutral-700",
  },
};

export function EquipamentoStatusBadge({
  status,
}: {
  status: EquipamentoStatus;
}) {
  const cfg = EQUIPAMENTO_STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

export function EmprestimoStatusBadge({
  status,
}: {
  status: StatusEmprestimoDerivado;
}) {
  const cfg = EMPRESTIMO_STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}
