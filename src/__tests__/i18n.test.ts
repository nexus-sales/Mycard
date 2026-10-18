import { describe, it, expect } from "vitest";
import {
  DEFAULT_LOCALE,
  fmt,
  intlLocale,
  isLocale,
  parseAcceptLanguage,
  resolveLocale,
} from "@/lib/i18n/config";
import {
  dictionaries,
  translateFieldErrors,
  translateValidation,
} from "@/lib/i18n/dictionaries";
import {
  cardContentUpdateSchema,
  loginSchema,
  registerSchema,
  slugSchema,
  socialLinkSchema,
  themeSchema,
} from "@/lib/validations";

/** Devuelve todas las rutas de claves de un objeto (las listas se comparan por longitud). */
function keyPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return [`${prefix}[${value.length}]`, ...value.flatMap((v, i) => keyPaths(v, `${prefix}[${i}]`))];
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(collectStrings);
  return [];
}

describe("i18n: diccionarios", () => {
  it("español e inglés tienen exactamente las mismas claves", () => {
    expect(keyPaths(dictionaries.en).sort()).toEqual(keyPaths(dictionaries.es).sort());
  });

  it("ninguna traducción está vacía", () => {
    for (const locale of ["es", "en"] as const) {
      for (const text of collectStrings(dictionaries[locale])) {
        expect(text.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("las variables {x} coinciden entre idiomas en cada texto", () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
    const es = collectStrings(dictionaries.es);
    const en = collectStrings(dictionaries.en);
    expect(en.length).toBe(es.length);
    es.forEach((text, i) => expect(vars(en[i])).toBe(vars(text)));
  });

  it("el inglés realmente está traducido (no copia el español en los textos principales)", () => {
    expect(dictionaries.en.auth.submit).not.toBe(dictionaries.es.auth.submit);
    expect(dictionaries.en.landing.title).not.toBe(dictionaries.es.landing.title);
    expect(dictionaries.en.editor.save).not.toBe(dictionaries.es.editor.save);
  });
});

describe("i18n: selección de idioma", () => {
  it("isLocale solo acepta es/en", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale("<script>")).toBe(false);
  });

  it("parseAcceptLanguage respeta el orden de preferencia (q)", () => {
    expect(parseAcceptLanguage("en-US,en;q=0.9,es;q=0.8")).toBe("en");
    expect(parseAcceptLanguage("es-ES,es;q=0.9,en;q=0.8")).toBe("es");
    expect(parseAcceptLanguage("fr-FR,en;q=0.5,es;q=0.9")).toBe("es");
    expect(parseAcceptLanguage("fr-FR,de;q=0.8")).toBeNull();
    expect(parseAcceptLanguage("en;q=0,es")).toBe("es");
    expect(parseAcceptLanguage("")).toBeNull();
    expect(parseAcceptLanguage(null)).toBeNull();
  });

  it("la cookie explícita gana sobre Accept-Language", () => {
    expect(resolveLocale("es", "en-US,en;q=0.9")).toBe("es");
    expect(resolveLocale("en", "es-ES")).toBe("en");
  });

  it("sin cookie válida usa Accept-Language y, si no, español", () => {
    expect(resolveLocale(undefined, "en-GB")).toBe("en");
    expect(resolveLocale("fr", "en-GB")).toBe("en");
    expect(resolveLocale(undefined, "fr-FR")).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(undefined, undefined)).toBe("es");
  });

  it("intlLocale devuelve etiquetas válidas para Intl", () => {
    expect(intlLocale("es")).toBe("es-ES");
    expect(intlLocale("en")).toBe("en-GB");
  });

  it("fmt sustituye variables y deja intactas las desconocidas", () => {
    expect(fmt("{shown} de {total}", { shown: 2, total: 10 })).toBe("2 de 10");
    expect(fmt("Hola {name}", {})).toBe("Hola {name}");
  });
});

describe("i18n: mensajes de validación (claves Zod → texto)", () => {
  const issues = (result: { success: boolean; error?: { errors: Array<{ message: string }> } }) =>
    result.error?.errors.map((e) => e.message) ?? [];

  it("los esquemas devuelven claves que existen en el diccionario", () => {
    const messages = [
      ...issues(slugSchema.safeParse("a")),
      ...issues(slugSchema.safeParse("-malo-")),
      ...issues(slugSchema.safeParse("admin")),
      ...issues(loginSchema.safeParse({ email: "x", password: "" })),
      ...issues(registerSchema.safeParse({ name: "a", password: "corta", confirmPassword: "otra", slug: "ab" })),
      ...issues(themeSchema.safeParse({ primaryColor: "rojo", accentColor: "azul" })),
      ...issues(socialLinkSchema.safeParse({ platform: "", url: "http://x.com" })),
      ...issues(
        cardContentUpdateSchema.safeParse({ name: "", phone: "abc", email: "no", website: "http://x.com" })
      ),
    ];

    expect(messages.length).toBeGreaterThan(8);
    for (const message of messages) {
      expect(message in dictionaries.es.validation, `clave desconocida: ${message}`).toBe(true);
      expect(message in dictionaries.en.validation, `clave desconocida: ${message}`).toBe(true);
    }
  });

  it("translateValidation traduce según el idioma y cae a un mensaje genérico", () => {
    expect(translateValidation(dictionaries.es, "slugMin")).toBe("El slug debe tener al menos 3 caracteres");
    expect(translateValidation(dictionaries.en, "slugMin")).toBe("The slug must be at least 3 characters long");
    expect(translateValidation(dictionaries.en, "String must contain at most 80 character(s)")).toBe(
      dictionaries.en.validation.generic
    );
    expect(translateValidation(dictionaries.es, undefined)).toBe(dictionaries.es.validation.generic);
  });

  it("translateFieldErrors traduce todos los campos", () => {
    const result = translateFieldErrors(dictionaries.en, { slug: ["slugMin"], email: ["emailInvalid"], x: undefined });
    expect(result).toEqual({
      slug: ["The slug must be at least 3 characters long"],
      email: ["Invalid email"],
    });
  });
});
