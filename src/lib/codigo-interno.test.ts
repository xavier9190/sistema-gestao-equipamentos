import { describe, expect, it } from "vitest";
import { proximoCodigoInterno } from "./codigo-interno";

describe("proximoCodigoInterno", () => {
  it("starts at INT-0001 when there are no existing codes", () => {
    expect(proximoCodigoInterno([])).toBe("INT-0001");
  });

  it("increments from the highest INT-XXXX code and pads to 4 digits", () => {
    expect(
      proximoCodigoInterno(["INT-0001", "INT-0011", "INT-0004", "PAT-9999"])
    ).toBe("INT-0012");
  });

  it("handles codes beyond 9999 without truncating digits", () => {
    expect(proximoCodigoInterno(["INT-9999"])).toBe("INT-10000");
  });

  it("ignores malformed INT codes", () => {
    expect(proximoCodigoInterno(["INT-ABC", "INT-", "INT-0002"])).toBe(
      "INT-0003"
    );
  });
});
