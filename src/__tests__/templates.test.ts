import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CardView from "@/components/card/CardView";
import { I18nProvider } from "@/lib/i18n/client";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { cardTemplateSchema, defaultTheme, type CardTemplateType } from "@/lib/validations";

const TEMPLATES = cardTemplateSchema.options as readonly CardTemplateType[];

describe("Estilos de tarjeta", () => {
  it("el enum de Prisma, la validación y los diccionarios tienen los mismos estilos", () => {
    const schema = readFileSync(resolve(__dirname, "../../prisma/schema.prisma"), "utf-8");
    const block = schema.match(/enum CardTemplate \{([^}]*)\}/)?.[1] ?? "";
    const prismaValues = block.split(/\s+/).filter(Boolean).sort();

    expect(prismaValues).toEqual([...TEMPLATES].sort());
    for (const locale of ["es", "en"] as const) {
      expect(Object.keys(dictionaries[locale].editor.templates).sort()).toEqual([...TEMPLATES].sort());
    }
  });

  it("hay una migración que añade cada estilo nuevo a la base de datos", () => {
    const migrations = readFileSync(
      resolve(__dirname, "../../prisma/migrations/20261018120000_more_templates/migration.sql"),
      "utf-8"
    );
    for (const value of ["LIGHT", "BOLD", "EDITORIAL"]) {
      expect(migrations).toContain(`ADD VALUE IF NOT EXISTS '${value}'`);
    }
  });

  const content = {
    name: "Ana Pérez",
    jobTitle: "Directora",
    company: "Norte Studio",
    bio: "Convierto ideas complejas en productos claros.",
    phone: "+34 600 000 000",
    email: "ana@example.com",
    website: "https://example.com",
    address: "Madrid, España",
    avatarPath: null,
    bannerPath: null,
    showPhone: true,
    showEmail: true,
    showAddress: true,
    socialLinks: [{ platform: "LinkedIn", url: "https://linkedin.com/in/ana" }],
  };

  const render = (template: CardTemplateType, locale: "es" | "en", overrides = {}) =>
    renderToStaticMarkup(
      // El archivo es .ts (sin JSX): los hijos van como prop
      // eslint-disable-next-line react/no-children-prop
      createElement(I18nProvider, {
        locale,
        dictionary: dictionaries[locale],
        children: createElement(CardView, {
          card: { slug: "ana", template, theme: defaultTheme, active: true, allowPublicWallet: true },
          content: { ...content, ...overrides },
          shareUrl: "https://mycard.nexus-sales.eu/c/ana",
        }),
      })
    );

  it.each(TEMPLATES)("la plantilla %s se renderiza con todos los datos de contacto", (template) => {
    const html = render(template, "es");
    expect(html).toContain("Ana Pérez");
    expect(html).toContain("Norte Studio");
    expect(html).toContain("mailto:ana@example.com");
    expect(html).toContain("tel:+34600000000");
    expect(html).toContain('href="https://example.com/"');
    expect(html).toContain("Madrid, España");
    expect(html).toContain("Guardar contacto");
  });

  it.each(TEMPLATES)("la plantilla %s respeta el idioma y las opciones de privacidad", (template) => {
    const html = render(template, "en", { showPhone: false, showEmail: false, showAddress: false });
    expect(html).toContain("Save contact");
    expect(html).not.toContain("Guardar contacto");
    expect(html).not.toContain("tel:");
    expect(html).not.toContain("mailto:");
    expect(html).not.toContain("Madrid, España");
  });

  it.each(["LIGHT", "EDITORIAL"] as const)("la plantilla clara %s usa botones para fondo claro", (template) => {
    const html = render(template, "es");
    expect(html).toContain("border-basalto/15");
  });

  it.each(["MINIMAL", "CLASSIC", "MODERN", "BOLD"] as const)("la plantilla oscura %s mantiene los botones oscuros", (template) => {
    const html = render(template, "es");
    expect(html).toContain("border-white/10");
    expect(html).not.toContain("border-basalto/15");
  });
});
