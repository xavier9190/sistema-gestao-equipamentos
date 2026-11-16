"use client";

import type { Html5Qrcode } from "html5-qrcode";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  normalizarCodigoLido,
  type EquipamentoBuscaRecord,
} from "@/lib/equipamento-busca";

interface LeitorCodigoProps {
  onEquipamentoEncontrado: (equipamento: EquipamentoBuscaRecord) => void;
  placeholder?: string;
}

const HTTPS_CAMERA_ERROR =
  "A câmera exige conexão segura (HTTPS). Use o leitor USB ou a digitação manual.";

function mapCameraError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes("notallowed") || lower.includes("permission")) {
    return "Permissão da câmera negada. Libere o acesso nas configurações do navegador ou use a digitação manual / leitor USB.";
  }
  if (lower.includes("notfound") || lower.includes("no camera")) {
    return "Nenhuma câmera encontrada neste dispositivo. Use o leitor USB ou a digitação manual.";
  }
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return HTTPS_CAMERA_ERROR;
  }
  return "Não foi possível iniciar a câmera. Verifique as permissões ou use a digitação manual.";
}

export function LeitorCodigo({
  onEquipamentoEncontrado,
  placeholder = "Bipe com o leitor USB ou digite (ex: PAT 000001, INT-0001)",
}: LeitorCodigoProps) {
  const scannerRegionId = useId().replace(/:/g, "");
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const stopCamera = useCallback(async () => {
    const instance = scannerRef.current;
    scannerRef.current = null;
    setCameraAtiva(false);

    if (instance) {
      try {
        await instance.stop();
      } catch {
        // Ignore if scanner was already stopped
      }
      try {
        instance.clear();
      } catch {
        // Ignore cleanup errors
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  const consultarCodigo = useCallback(
    async (valor: string) => {
      const normalized = normalizarCodigoLido(valor);
      if (!normalized) {
        setErro("Informe um código de patrimônio ou código interno.");
        inputRef.current?.focus();
        return;
      }

      setErro(null);
      setBuscando(true);

      try {
        const res = await fetch(
          `/api/equipamentos/buscar-codigo?codigo=${encodeURIComponent(normalized)}`
        );
        const data = (await res.json()) as {
          ok?: boolean;
          message?: string;
          equipamento?: EquipamentoBuscaRecord;
        };

        if (!res.ok || !data.ok || !data.equipamento) {
          setErro(data.message ?? "Equipamento não encontrado.");
          return;
        }

        onEquipamentoEncontrado(data.equipamento);
        setCodigo("");
      } catch {
        setErro("Erro de conexão ao consultar o código.");
      } finally {
        setBuscando(false);
        inputRef.current?.focus();
      }
    },
    [onEquipamentoEncontrado]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await consultarCodigo(codigo);
  }

  async function handleToggleCamera() {
    if (cameraAtiva) {
      await stopCamera();
      inputRef.current?.focus();
      return;
    }

    setErro(null);
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setErro(HTTPS_CAMERA_ERROR);
      return;
    }

    try {
      const { Html5Qrcode: Html5QrcodeCtor, Html5QrcodeSupportedFormats } =
        await import("html5-qrcode");
      const scanner = new Html5QrcodeCtor(scannerRegionId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
        ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
        verbose: false,
      });
      scannerRef.current = scanner;
      setCameraAtiva(true);

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => ({
            width: Math.max(180, Math.floor(viewfinderWidth * 0.82)),
            height: Math.max(110, Math.floor(viewfinderHeight * 0.58)),
          }),
          aspectRatio: 16 / 9,
          disableFlip: false,
        },
        (decodedText) => {
          setCodigo(decodedText);
          void stopCamera().then(() => consultarCodigo(decodedText));
        },
        () => {
          // Ignore per-frame decode misses
        }
      );
    } catch (err) {
      await stopCamera();
      setErro(mapCameraError(err));
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="text"
          autoFocus
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder={placeholder}
          aria-label="Código do equipamento"
          className="min-w-64 flex-1 rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none"
        />

        <button
          type="submit"
          disabled={buscando}
          className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
        >
          {buscando ? "Buscando..." : "Buscar"}
        </button>

        <button
          type="button"
          onClick={() => void handleToggleCamera()}
          className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
            cameraAtiva
              ? "border-red-300 bg-red-50 text-red-800 hover:bg-red-100"
              : "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          {cameraAtiva ? "Parar câmera" : "Usar câmera"}
        </button>
      </form>

      <div
        id={scannerRegionId}
        className={
          cameraAtiva
            ? "mx-auto max-w-md overflow-hidden rounded-xl border border-neutral-300 bg-black"
            : "hidden"
        }
      />

      {erro && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-800"
        >
          {erro}
        </div>
      )}
    </div>
  );
}
