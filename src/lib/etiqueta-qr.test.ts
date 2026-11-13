import { describe, expect, it } from "vitest";
import { gerarQrCodeSvg } from "./etiqueta-qr";

describe("gerarQrCodeSvg", () => {
  it("generates a valid SVG string for an equipment code", async () => {
    const svg = await gerarQrCodeSvg("INT-0012");

    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("rejects empty codes", async () => {
    await expect(gerarQrCodeSvg("   ")).rejects.toThrow(
      "Código da etiqueta não pode ser vazio"
    );
  });
});
