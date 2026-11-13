import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("parses valid environment variables", () => {
    const result = parseEnv({
      DATABASE_URL: "postgresql://sge:pass@localhost:5432/sge_db",
      NODE_ENV: "development",
    });

    expect(result).toEqual({
      DATABASE_URL: "postgresql://sge:pass@localhost:5432/sge_db",
      NODE_ENV: "development",
    });
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });
});