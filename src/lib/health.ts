import type { StructuredLogger } from "./logger";

export interface HealthCheckDeps {
  pingDatabase: () => Promise<void>;
  logger: StructuredLogger;
  now?: () => Date;
}

export interface HealthCheckResult {
  httpStatus: 200 | 503;
  body: {
    status: "ok" | "degraded";
    database: "up" | "down";
    timestamp: string;
  };
}

/** Checks application and database readiness and emits structured logs. */
export async function checkHealth({
  pingDatabase,
  logger,
  now = () => new Date(),
}: HealthCheckDeps): Promise<HealthCheckResult> {
  const timestamp = now().toISOString();

  try {
    await pingDatabase();
    logger.info("healthcheck.ok", { database: "up" });
    return {
      httpStatus: 200,
      body: { status: "ok", database: "up", timestamp },
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    logger.error("healthcheck.degraded", { database: "down", reason });
    return {
      httpStatus: 503,
      body: { status: "degraded", database: "down", timestamp },
    };
  }
}
