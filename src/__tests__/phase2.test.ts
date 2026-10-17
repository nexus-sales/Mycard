import { describe, it, expect } from "vitest";
import {
  cardContentUpdateSchema,
  cardTemplateSchema,
  themeSchema,
  socialLinksSchema,
  sanitizeExternalUrl,
  sanitizeTelUrl,
  sanitizeMailtoUrl,
} from "@/lib/validations";
import { getSafeUploadFilePath } from "@/lib/upload";

describe("Fase 2 - Validaciones de Contenido de Tarjeta", () => {
  it("valida un contenido correcto con campos mínimos", () => {
    const res = cardContentUpdateSchema.safeParse({
      name: "Ana López",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.name).toBe("Ana López");
      expect(res.data.showEmail).toBe(true);
      expect(res.data.showPhone).toBe(false);
      expect(res.data.showAddress).toBe(false);
    }
  });

  it("rechaza nombres vacíos o excesivamente largos", () => {
    expect(cardContentUpdateSchema.safeParse({ name: "" }).success).toBe(false);
    expect(cardContentUpdateSchema.safeParse({ name: "a".repeat(81) }).success).toBe(false);
  });

  it("rechaza biografías superiores a 500 caracteres", () => {
    expect(
      cardContentUpdateSchema.safeParse({
        name: "Ana",
        bio: "x".repeat(501),
      }).success
    ).toBe(false);
  });

  it("valida que el website use estrictamente https://", () => {
    expect(
      cardContentUpdateSchema.safeParse({
        name: "Ana",
        website: "https://analopez.com",
      }).success
    ).toBe(true);

    expect(
      cardContentUpdateSchema.safeParse({
        name: "Ana",
        website: "http://inseguro.com",
      }).success
    ).toBe(false);

    expect(
      cardContentUpdateSchema.safeParse({
        name: "Ana",
        website: "javascript:alert(1)",
      }).success
    ).toBe(false);
  });
});

describe("Fase 2 - Enlaces Sociales y Sanitización", () => {
  it("valida redes sociales con URLs https", () => {
    const valid = [
      { platform: "LinkedIn", url: "https://linkedin.com/in/ana" },
      { platform: "GitHub", url: "https://github.com/ana" },
    ];
    expect(socialLinksSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza redes sociales con protocolo http no seguro o esquemas inválidos", () => {
    const invalid = [
      { platform: "Insegura", url: "http://sitio.com" },
    ];
    expect(socialLinksSchema.safeParse(invalid).success).toBe(false);

    const malicious = [
      { platform: "Ataque", url: "javascript:evil()" },
    ];
    expect(socialLinksSchema.safeParse(malicious).success).toBe(false);
  });

  it("sanitizeExternalUrl permite únicamente https://", () => {
    expect(sanitizeExternalUrl("https://seguro.com/perfil")).toBe("https://seguro.com/perfil");
    expect(sanitizeExternalUrl("http://inseguro.com")).toBeNull();
    expect(sanitizeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeExternalUrl("data:text/html,<script></script>")).toBeNull();
    expect(sanitizeExternalUrl("")).toBeNull();
  });

  it("sanitizeTelUrl extrae números limpios", () => {
    expect(sanitizeTelUrl("+34 600 123 456")).toBe("tel:+34600123456");
    expect(sanitizeTelUrl("600-123-456")).toBe("tel:600123456");
    expect(sanitizeTelUrl("12")).toBeNull(); // Muy corto
    expect(sanitizeTelUrl(null)).toBeNull();
  });

  it("sanitizeMailtoUrl valida el formato de correo", () => {
    expect(sanitizeMailtoUrl("ana@empresa.com")).toBe("mailto:ana@empresa.com");
    expect(sanitizeMailtoUrl("invalido")).toBeNull();
    expect(sanitizeMailtoUrl("")).toBeNull();
  });
});

describe("Fase 2 - Plantillas y Tema", () => {
  it("acepta solo las plantillas válidas del enum", () => {
    expect(cardTemplateSchema.safeParse("MINIMAL").success).toBe(true);
    expect(cardTemplateSchema.safeParse("MODERN").success).toBe(true);
    expect(cardTemplateSchema.safeParse("CLASSIC").success).toBe(true);
    expect(cardTemplateSchema.safeParse("UNKNOWN").success).toBe(false);
  });

  it("valida colores HEX válidos en el tema", () => {
    const validTheme = {
      primaryColor: "#4f46e5",
      accentColor: "#06b6d4",
      fontFamily: "sans",
      bgMode: "dark",
    };
    expect(themeSchema.safeParse(validTheme).success).toBe(true);

    const invalidColor = {
      ...validTheme,
      primaryColor: "blue", // No es hex
    };
    expect(themeSchema.safeParse(invalidColor).success).toBe(false);
  });
});

describe("Fase 2 - Seguridad de Archivos y Prevención de Path Traversal", () => {
  it("valida nombres de subida legítimos", () => {
    const validFilename = "a1b2c3d4e5f60718293a4b5c6d7e8f90.webp";
    const path = getSafeUploadFilePath(validFilename);
    expect(path).not.toBeNull();
    expect(path?.endsWith(validFilename)).toBe(true);
  });

  it("bloquea intentos de Path Traversal", () => {
    expect(getSafeUploadFilePath("../../etc/passwd")).toBeNull();
    expect(getSafeUploadFilePath("..\\..\\windows\\system32")).toBeNull();
    expect(getSafeUploadFilePath("archivo.jpg")).toBeNull(); // No es hex32.webp
    expect(getSafeUploadFilePath("a1b2c3d4e5f60718293a4b5c6d7e8f90.exe")).toBeNull();
  });
});
