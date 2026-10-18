import { describe, it, expect } from "vitest";
import { getContrastRatio, readableTextColor } from "@/lib/qr";

describe("readableTextColor (texto legible sobre el color que elige el usuario)", () => {
  const DARK = "#14100D";
  const LIGHT = "#F0EDE6";

  it("usa texto oscuro sobre fondos claros (voltio, blanco, cal)", () => {
    expect(readableTextColor("#FFC300")).toBe(DARK);
    expect(readableTextColor("#ffffff")).toBe(DARK);
    expect(readableTextColor("#E3DFD5")).toBe(DARK);
  });

  it("usa texto claro sobre fondos oscuros (mar, basalto, azul marino)", () => {
    expect(readableTextColor("#0D4F52")).toBe(LIGHT);
    expect(readableTextColor("#14100D")).toBe(LIGHT);
    expect(readableTextColor("#1e3a8a")).toBe(LIGHT);
  });

  it("acepta HEX de 3 dígitos y elige siempre la opción con más contraste", () => {
    expect(readableTextColor("#fff")).toBe(DARK);
    for (const bg of ["#FFC300", "#0D4F52", "#4f46e5", "#06b6d4", "#e11d48", "#16a34a", "#7A6E63"]) {
      const chosen = getContrastRatio(bg, readableTextColor(bg));
      expect(chosen).toBeGreaterThanOrEqual(getContrastRatio(bg, DARK) - 1e-9);
      expect(chosen).toBeGreaterThanOrEqual(getContrastRatio(bg, LIGHT) - 1e-9);
    }
  });

  it("los colores de marca cumplen WCAG AA (4.5:1)", () => {
    for (const bg of ["#FFC300", "#0D4F52", "#14100D", "#F0EDE6"]) {
      expect(getContrastRatio(bg, readableTextColor(bg))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("con un valor no válido no lanza y devuelve un color de texto", () => {
    expect([DARK, LIGHT]).toContain(readableTextColor(""));
    expect([DARK, LIGHT]).toContain(readableTextColor("rojo"));
  });
});
