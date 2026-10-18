/** Configuración de idiomas. Módulo puro: usable en servidor y cliente. */

export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";
export const LOCALE_COOKIE = "lang";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 año

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Elige el idioma a partir de la cabecera Accept-Language.
 * Respeta el orden de preferencia (q) y solo devuelve idiomas soportados.
 */
export function parseAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;

  const candidates = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return { lang: tag.trim().toLowerCase().split("-")[0], q: Number.isNaN(q) ? 0 : q, index };
    })
    .filter((c) => c.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);

  for (const candidate of candidates) {
    if (isLocale(candidate.lang)) return candidate.lang;
  }
  return null;
}

/** Cookie explícita > Accept-Language > idioma por defecto. */
export function resolveLocale(
  cookieValue: string | null | undefined,
  acceptLanguage: string | null | undefined
): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  return parseAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
}

/** Etiqueta BCP 47 para Intl / toLocaleDateString. */
export function intlLocale(locale: Locale): string {
  return locale === "en" ? "en-GB" : "es-ES";
}

/** Sustituye {variable} en una plantilla. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}
