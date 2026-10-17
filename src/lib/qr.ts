/**
 * Calcula la luminancia relativa de un color HEX según la especificación WCAG 2.1
 */
function getLuminance(hex: string): number {
  const cleanHex = hex.replace("#", "");
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split("")
          .map((c) => c + c)
          .join("")
      : cleanHex;

  const r = parseInt(fullHex.slice(0, 2), 16) / 255;
  const g = parseInt(fullHex.slice(2, 4), 16) / 255;
  const b = parseInt(fullHex.slice(4, 6), 16) / 255;

  const transform = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

/**
 * Calcula el ratio de contraste entre dos colores HEX (1:1 a 21:1).
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  try {
    const l1 = getLuminance(hex1);
    const l2 = getLuminance(hex2);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    return (brightest + 0.05) / (darkest + 0.05);
  } catch {
    return 1;
  }
}

/**
 * Determina si el contraste entre los colores del QR es suficiente para
 * garantizar una lectura fiable en cámaras móviles (mínimo ratio 3.5:1).
 */
export function isQrContrastScannable(fgColor: string, bgColor: string): {
  isScannable: boolean;
  ratio: number;
} {
  const ratio = Math.round(getContrastRatio(fgColor, bgColor) * 10) / 10;
  return {
    isScannable: ratio >= 3.5,
    ratio,
  };
}
