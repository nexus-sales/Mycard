import { describe, it, expect } from "vitest";
import {
  escapeVCardValue,
  foldVCardLine,
  generateVCardString,
  VCardContactData,
} from "@/lib/vcard";
import { isQrContrastScannable, getContrastRatio } from "@/lib/qr";
import { isLikelyBot } from "@/lib/analytics";
import { rateLimit } from "@/lib/rate-limit";

describe("Fase 3 - vCard 3.0: Escapado y Mitigación de Inyecciones Hostiles", () => {
  it("escapa comas, puntos y comas y barras invertidas", () => {
    const raw = "García, Juan; Software\\Engineer";
    const escaped = escapeVCardValue(raw);
    expect(escaped).toBe("García\\, Juan\\; Software\\\\Engineer");
  });

  it("neutraliza intentos de inyección de líneas 'END:VCARD' convirtiendo saltos en literales \\n", () => {
    const hostileBio = "Ingeniero\r\nEND:VCARD\r\nBEGIN:VCARD\r\nFN:Hacker";
    const escaped = escapeVCardValue(hostileBio);

    // Los saltos reales deben desaparecer; se convierten en literal \n
    expect(escaped).not.toContain("\r");
    expect(escaped).not.toContain("\n");
    expect(escaped).toBe("Ingeniero\\nEND:VCARD\\nBEGIN:VCARD\\nFN:Hacker");
  });

  it("pliega líneas que excedan los 75 octetos con CRLF y espacio (Line Folding RFC)", () => {
    const longString = "A".repeat(120);
    const folded = foldVCardLine(longString, 75);

    // Debe contener CRLF seguido de un espacio
    expect(folded).toContain("\r\n ");
    const lines = folded.split("\r\n");
    expect(lines[0].length).toBe(75);
    expect(lines[1].startsWith(" ")).toBe(true);
    expect(lines[1].length).toBe(120 - 75 + 1); // espacio + resto
  });

  it("genera un vCard 3.0 válido y respeta la privacidad de los campos ocultos", async () => {
    const data: VCardContactData = {
      slug: "carlos-test",
      name: "Carlos Mendoza, Jr.",
      jobTitle: "CTO; Fundador",
      company: "Tech Solutions\\Corp",
      bio: "Apasionado por la ciberseguridad.\r\nLínea 2.",
      phone: "+34 600 111 222",
      email: "carlos@tech.com",
      website: "https://carlos.dev",
      address: "Calle Mayor 1, Madrid",
      showPhone: false, // Oculto intencionadamente
      showEmail: true,
      showAddress: false, // Oculto intencionadamente
      socialLinks: [
        { platform: "LinkedIn", url: "https://linkedin.com/in/carlos" },
      ],
    };

    const vcard = await generateVCardString(data);

    // Verificaciones estructurales
    expect(vcard.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n")).toBe(true);
    expect(vcard.endsWith("END:VCARD\r\n")).toBe(true);

    // Email visible
    expect(vcard).toContain("EMAIL;TYPE=INTERNET,PREF:carlos@tech.com");

    // Teléfono y Dirección OCULTOS: no deben aparecer en el archivo
    expect(vcard).not.toContain("TEL;");
    expect(vcard).not.toContain("600 111 222");
    expect(vcard).not.toContain("ADR;");
    expect(vcard).not.toContain("Calle Mayor");

    // Caracteres especiales escapados correctamente
    expect(vcard).toContain("FN:Carlos Mendoza\\, Jr.");
    expect(vcard).toContain("TITLE:CTO\\; Fundador");
    expect(vcard).toContain("ORG:Tech Solutions\\\\Corp");

    // Redes sociales
    expect(vcard).toContain("X-SOCIALPROFILE;TYPE=LinkedIn:https://linkedin.com/in/carlos");
  });
});

describe("Fase 3 - Verificación de Contraste y QR", () => {
  it("determina que negro sobre blanco tiene contraste excelente (>15:1)", () => {
    const ratio = getContrastRatio("#000000", "#ffffff");
    expect(ratio).toBeGreaterThan(15);
    const check = isQrContrastScannable("#000000", "#ffffff");
    expect(check.isScannable).toBe(true);
  });

  it("determina que colores con poco contraste no son escaneables", () => {
    // Blanco sobre amarillo claro
    const checkLow = isQrContrastScannable("#ffffff", "#fef08a");
    expect(checkLow.isScannable).toBe(false);
    expect(checkLow.ratio).toBeLessThan(3.5);

    // Negro sobre gris muy oscuro
    const checkDark = isQrContrastScannable("#000000", "#1e293b");
    expect(checkDark.isScannable).toBe(false);
  });
});

describe("Fase 3 - Detección de Bots para Contador Anónimo", () => {
  it("detecta crawlers y spiders conocidos", () => {
    expect(isLikelyBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    expect(isLikelyBot("WhatsApp/2.21.12.21 A")).toBe(true);
    expect(isLikelyBot("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)")).toBe(true);
    expect(isLikelyBot("Twitterbot/1.0")).toBe(true);
    expect(isLikelyBot("curl/7.68.0")).toBe(true);
    expect(isLikelyBot("python-requests/2.25.1")).toBe(true);
    expect(isLikelyBot(null)).toBe(true);
    expect(isLikelyBot("")).toBe(true);
  });

  it("permite navegadores humanos reales", () => {
    const chromeUA =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(isLikelyBot(chromeUA)).toBe(false);

    const iPhoneUA =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    expect(isLikelyBot(iPhoneUA)).toBe(false);
  });
});

describe("Fase 3 - Rate Limiting de Tarjetas y vCard", () => {
  it("permite y luego bloquea tras superar el umbral de vCard", () => {
    const ip = `test-vcard-ip-${Date.now()}`;
    const cfg = { windowMs: 60_000, max: 2 };

    expect(rateLimit(`vcard:${ip}`, cfg).allowed).toBe(true);
    expect(rateLimit(`vcard:${ip}`, cfg).allowed).toBe(true);
    expect(rateLimit(`vcard:${ip}`, cfg).allowed).toBe(false);
  });

  it("mantiene aisladas las claves y calcula los intentos restantes", () => {
    const suffix = `${Date.now()}-${Math.random()}`;
    const cfg = { windowMs: 60_000, max: 3 };

    const first = rateLimit(`card:a-${suffix}`, cfg);
    const second = rateLimit(`card:a-${suffix}`, cfg);
    const independent = rateLimit(`card:b-${suffix}`, cfg);

    expect(first.remaining).toBe(2);
    expect(second.remaining).toBe(1);
    expect(independent.remaining).toBe(2);
    expect(first.resetAt).toBeGreaterThan(Date.now());
  });
});
