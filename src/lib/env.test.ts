import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("parses valid environment variables", () => {
    const result = parseEnv({
      DATABASE_URL: "postgresql://sge:pass@localhost:5432/sge_db",
      AUTH_SECRET: "a-very-long-secret-key-with-at-least-32-chars",
      NODE_ENV: "development",
      GOOGLE_SHEETS_CSV_URL: "https://docs.google.com/spreadsheets/d/123/export?format=csv",
    });

    expect(result).toEqual({
      DATABASE_URL: "postgresql://sge:pass@localhost:5432/sge_db",
      AUTH_SECRET: "a-very-long-secret-key-with-at-least-32-chars",
      NODE_ENV: "development",
      GOOGLE_SHEETS_CSV_URL: "https://docs.google.com/spreadsheets/d/123/export?format=csv",
    });
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() =>
      parseEnv({
        AUTH_SECRET: "a-very-long-secret-key-with-at-least-32-chars",
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it("throws when AUTH_SECRET is shorter than 32 characters", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "postgresql://sge:pass@localhost:5432/sge_db",
        AUTH_SECRET: "short",
      }),
    ).toThrow(/AUTH_SECRET/);
  });
});
