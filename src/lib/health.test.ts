import { describe, expect, it, vi } from "vitest";
import { checkHealth } from "./health";

describe("checkHealth", () => {
  it("returns status ok and database up when ping succeeds", async () => {
    const info = vi.fn();
    const error = vi.fn();

    const result = await checkHealth({
      pingDatabase: async () => {},
      logger: { info, error },
      now: () => new Date("2026-11-13T05:00:00.000Z"),
    });

    expect(result).toEqual({
      httpStatus: 200,
      body: {
        status: "ok",
        database: "up",
        timestamp: "2026-11-13T05:00:00.000Z",
      },
    });
    expect(info).toHaveBeenCalledWith("healthcheck.ok", { database: "up" });
    expect(error).not.toHaveBeenCalled();
  });

  it("returns status degraded (503) and logs error when database ping fails", async () => {
    const info = vi.fn();
    const error = vi.fn();

    const result = await checkHealth({
      pingDatabase: async () => {
        throw new Error("connection refused");
      },
      logger: { info, error },
      now: () => new Date("2026-11-13T05:00:00.000Z"),
    });

    expect(result).toEqual({
      httpStatus: 503,
      body: {
        status: "degraded",
        database: "down",
        timestamp: "2026-11-13T05:00:00.000Z",
      },
    });
    expect(error).toHaveBeenCalledWith("healthcheck.degraded", {
      database: "down",
      reason: "connection refused",
    });
  });
});
