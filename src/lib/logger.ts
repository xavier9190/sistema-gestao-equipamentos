export interface StructuredLogger {
  info: (event: string, meta?: Record<string, unknown>) => void;
  error: (event: string, meta?: Record<string, unknown>) => void;
}

function writeLog(
  level: "info" | "error",
  event: string,
  meta?: Record<string, unknown>,
) {
  const payload = JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...meta,
  });
  if (level === "error") {
    console.error(payload);
  } else {
    console.info(payload);
  }
}

export const logger: StructuredLogger = {
  info: (event, meta) => writeLog("info", event, meta),
  error: (event, meta) => writeLog("error", event, meta),
};
