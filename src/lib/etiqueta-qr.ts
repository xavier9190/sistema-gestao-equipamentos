import QRCode from "qrcode";

/** Generates a crisp SVG QR Code for an equipment label. */
export async function gerarQrCodeSvg(codigo: string): Promise<string> {
  const normalized = codigo.trim();
  if (!normalized) {
    throw new Error("Código da etiqueta não pode ser vazio.");
  }

  return QRCode.toString(normalized, {
    type: "svg",
    margin: 1,
    width: 180,
  });
}
