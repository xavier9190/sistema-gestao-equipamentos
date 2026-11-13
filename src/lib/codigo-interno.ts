const INT_CODE_PATTERN = /^INT-(\d+)$/i;

/** Computes the next sequential INT-XXXX internal code from existing codes. */
export function proximoCodigoInterno(existingCodes: readonly string[]): string {
  let maxNumber = 0;

  for (const code of existingCodes) {
    const match = INT_CODE_PATTERN.exec(code.trim());
    if (!match) {
      continue;
    }
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isFinite(parsed) && parsed > maxNumber) {
      maxNumber = parsed;
    }
  }

  const next = maxNumber + 1;
  return `INT-${String(next).padStart(4, "0")}`;
}

/** Returns the primary display identifier for an equipment item. */
export function formatarCodigoEquipamento(item: {
  codigoInterno?: string | null;
  codigoPatrimonio?: string | null;
}): string {
  return item.codigoInterno ?? item.codigoPatrimonio ?? "-";
}
