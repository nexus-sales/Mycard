"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { isQrContrastScannable } from "@/lib/qr";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/config";


interface QrCodeGeneratorProps {
  url: string;
  slug: string;
}

export default function QrCodeGenerator({ url, slug }: QrCodeGeneratorProps) {
  const { t } = useI18n();
  const [fgColor, setFgColor] = useState("#14100D");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [margin, setMargin] = useState(2);
  const [svgString, setSvgString] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Verificación de contraste en tiempo real
  const contrastCheck = isQrContrastScannable(fgColor, bgColor);

  // Generar QR cada vez que cambien opciones
  useEffect(() => {
    // 1. Renderizar en Canvas
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 256,
        margin,
        color: {
          dark: fgColor,
          light: bgColor,
        },
        errorCorrectionLevel: "M",
      }).catch((err) => console.error("Error generando canvas QR:", err));
    }

    // 2. Generar SVG
    QRCode.toString(url, {
      type: "svg",
      margin,
      color: {
        dark: fgColor,
        light: bgColor,
      },
      errorCorrectionLevel: "M",
    })
      .then((svg) => setSvgString(svg))
      .catch((err) => console.error("Error generando SVG QR:", err));
  }, [url, fgColor, bgColor, margin]);

  // Descarga en formato PNG a alta resolución (1024px)
  const downloadPng = async () => {
    try {
      const highResDataUrl = await QRCode.toDataURL(url, {
        width: 1024,
        margin,
        color: {
          dark: fgColor,
          light: bgColor,
        },
        errorCorrectionLevel: "H",
      });

      const a = document.createElement("a");
      a.href = highResDataUrl;
      a.download = `qr-${slug}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error descargando PNG:", err);
    }
  };

  // Descarga en formato SVG vectorial
  const downloadSvg = () => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `qr-${slug}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <div className="bg-paper-2 border border-ink/15 rounded-2xl p-6 space-y-6 shadow-xl">
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sea" />
          {t.qr.title}
        </h2>
        <p className="text-xs text-ink-2">
          {t.qr.introBefore}
          <code className="text-sea font-mono text-[11px]">{url}</code>
          {t.qr.introAfter}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
        {/* Visualización del QR */}
        <div className="sm:col-span-5 flex flex-col items-center space-y-3">
          <div className="p-3 bg-white rounded-2xl shadow-lg border border-slate-200 inline-flex items-center justify-center">
            <canvas ref={canvasRef} className="rounded-lg max-w-[200px] h-auto" />
          </div>

          {/* Indicador de contraste */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-paper/60 border-ink/15">
              <span
                className={`w-2 h-2 rounded-full ${
                  contrastCheck.isScannable ? "bg-emerald-400" : "bg-amber-400 animate-ping"
                }`}
              />
              <span className={contrastCheck.isScannable ? "text-ink-2" : "text-amber-700 dark:text-amber-300 font-semibold"}>
                {fmt(t.qr.contrast, { ratio: contrastCheck.ratio })} {contrastCheck.isScannable ? t.qr.contrastOk : t.qr.contrastLow}
              </span>
            </div>

            {!contrastCheck.isScannable && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 max-w-[220px] leading-tight">
                {t.qr.contrastWarning}
              </p>
            )}
          </div>
        </div>

        {/* Controles y Descargas */}
        <div className="sm:col-span-7 space-y-4 text-xs">
          {/* Color del código */}
          <div>
            <label className="block font-medium text-ink-2 mb-1.5">{t.qr.fgColor}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="w-8 h-8 rounded-lg bg-paper border border-ink/15 cursor-pointer"
              />
              <input
                type="text"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="flex-1 rounded-lg bg-paper border border-ink/15 px-3 py-1.5 text-ink font-mono uppercase"
              />
            </div>
            {/* Presets rápidos de color */}
            <div className="flex gap-2 mt-1.5">
              {[
                { name: t.qr.presetsFg.basalto, color: "#14100D" },
                { name: t.qr.presetsFg.mar, color: "#0D4F52" },
                { name: t.qr.presetsFg.picon, color: "#3A322B" },
              ].map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => setFgColor(c.color)}
                  className="px-2 py-0.5 rounded bg-paper hover:bg-ink-3/30 text-ink-2 text-[10px] border border-ink/15"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Color de fondo */}
          <div>
            <label className="block font-medium text-ink-2 mb-1.5">{t.qr.bgColor}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-8 h-8 rounded-lg bg-paper border border-ink/15 cursor-pointer"
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="flex-1 rounded-lg bg-paper border border-ink/15 px-3 py-1.5 text-ink font-mono uppercase"
              />
            </div>
            <div className="flex gap-2 mt-1.5">
              {[
                { name: t.qr.presetsBg.white, color: "#ffffff" },
                { name: t.qr.presetsBg.cal, color: "#F0EDE6" },
                { name: t.qr.presetsBg.calAlt, color: "#E3DFD5" },
              ].map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => setBgColor(c.color)}
                  className="px-2 py-0.5 rounded bg-paper hover:bg-ink-3/30 text-ink-2 text-[10px] border border-ink/15"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Margen */}
          <div>
            <label className="block font-medium text-ink-2 mb-1.5">{t.qr.margin}</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 1, label: t.qr.marginMin },
                { value: 2, label: t.qr.marginStd },
                { value: 4, label: t.qr.marginWide },
              ].map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMargin(m.value)}
                  className={`py-1.5 rounded-lg border text-center transition-colors ${
                    margin === m.value
                      ? "border-sea bg-sea/20 text-ink font-semibold"
                      : "border-ink/15 bg-paper/60 text-ink-2 hover:text-ink"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Botones de Descarga */}
          <div className="pt-2 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={downloadPng}
              className="py-2.5 px-3 rounded-xl bg-paper hover:bg-ink-3/30 text-ink font-semibold border border-ink/15 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            >
              <svg className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t.qr.downloadPng}
            </button>

            <button
              type="button"
              onClick={downloadSvg}
              className="py-2.5 px-3 rounded-xl bg-paper hover:bg-ink-3/30 text-ink font-semibold border border-ink/15 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            >
              <svg className="w-3.5 h-3.5 text-sea" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t.qr.downloadSvg}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
