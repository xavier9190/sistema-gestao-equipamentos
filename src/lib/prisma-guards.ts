const BLOCKED_MUTATION_OPERATIONS = new Set([
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
]);

/** Error thrown when code attempts to update or delete an immutable Movimentacao record. */
export class MovimentacaoImmutabilityError extends Error {
  constructor(operation: string) {
    super(
      `Movimentacao records are immutable and cannot be modified via '${operation}'`
    );
    this.name = "MovimentacaoImmutabilityError";
  }
}

export interface MovimentacaoQueryParams<TArgs = unknown, TResult = unknown> {
  operation: string;
  args: TArgs;
  query: (args: TArgs) => Promise<TResult>;
}

/**
 * Prisma query extension guard that blocks updates and deletes on Movimentacao (ADR-0003).
 */
export async function movimentacaoQueryGuard<TArgs, TResult>({
  operation,
  args,
  query,
}: MovimentacaoQueryParams<TArgs, TResult>): Promise<TResult> {
  if (BLOCKED_MUTATION_OPERATIONS.has(operation)) {
    throw new MovimentacaoImmutabilityError(operation);
  }
  return query(args);
}
