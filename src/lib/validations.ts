import { z } from "zod";

// ─────────────────────────────────────────────
// Slugs
// ─────────────────────────────────────────────
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "dashboard",
  "invite",
  "login",
  "logout",
  "c",
  "cards",
  "settings",
  "profile",
  "public",
  "static",
  "favicon",
  "robots",
  "sitemap",
  "_next",
]);

export const slugSchema = z
  .string()
  .min(3, "El slug debe tener al menos 3 caracteres")
  .max(32, "El slug no puede superar 32 caracteres")
  .regex(
    /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
    "Solo minúsculas, números y guiones (no puede empezar ni terminar con guión)"
  )
  .refine((s) => !RESERVED_SLUGS.has(s), {
    message: "Este slug está reservado, elige otro",
  });

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Nombre demasiado corto").max(80).trim(),
    password: z
      .string()
      .min(12, "La contraseña debe tener al menos 12 caracteres")
      .max(128, "Contraseña demasiado larga"),
    confirmPassword: z.string(),
    slug: slugSchema,
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

// ─────────────────────────────────────────────
// Admin: crear invitación
// ─────────────────────────────────────────────
export const createInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),
  expiresInHours: z.coerce
    .number()
    .int()
    .min(1)
    .max(720)
    .default(48),
});

// ─────────────────────────────────────────────
// Theme y Plantilla
// ─────────────────────────────────────────────
export const cardTemplateSchema = z.enum(["MINIMAL", "MODERN", "CLASSIC"]);
export type CardTemplateType = z.infer<typeof cardTemplateSchema>;

export const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const themeSchema = z.object({
  primaryColor: z
    .string()
    .regex(hexColorRegex, "Color primario inválido (debe ser código HEX, ej: #2563eb)")
    .default("#4f46e5"),
  accentColor: z
    .string()
    .regex(hexColorRegex, "Color secundario inválido (debe ser código HEX)")
    .default("#06b6d4"),
  fontFamily: z.enum(["sans", "serif", "mono"]).default("sans"),
  bgMode: z.enum(["dark", "light", "gradient"]).default("dark"),
});

export type CardTheme = z.infer<typeof themeSchema>;

export const defaultTheme: CardTheme = {
  primaryColor: "#4f46e5",
  accentColor: "#06b6d4",
  fontFamily: "sans",
  bgMode: "dark",
};

// ─────────────────────────────────────────────
// CardContent socialLinks
// ─────────────────────────────────────────────
export const socialLinkSchema = z.object({
  platform: z
    .string()
    .min(1, "Plataforma requerida")
    .max(32)
    .trim(),
  url: z
    .string()
    .trim()
    .url("URL inválida")
    .refine((u) => u.startsWith("https://"), {
      message: "Las URLs externas deben usar protocolo seguro (https://)",
    }),
});

export const socialLinksSchema = z.array(socialLinkSchema).max(12);
export type SocialLink = z.infer<typeof socialLinkSchema>;

// ─────────────────────────────────────────────
// Actualización completa de Card y CardContent
// ─────────────────────────────────────────────
export const cardContentUpdateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  jobTitle: z.string().trim().max(80).default(""),
  company: z.string().trim().max(80).default(""),
  bio: z.string().trim().max(500).default(""),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^(\+?[0-9\s\-().]{5,30})?$/, "Número de teléfono con formato inválido")
    .default(""),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email inválido")
    .or(z.literal(""))
    .default(""),
  website: z
    .string()
    .trim()
    .url("URL de sitio web inválida")
    .refine((u) => u === "" || u.startsWith("https://"), {
      message: "El sitio web debe comenzar por https://",
    })
    .or(z.literal(""))
    .default(""),
  address: z.string().trim().max(150).default(""),
  showPhone: z.boolean().default(false),
  showEmail: z.boolean().default(true),
  showAddress: z.boolean().default(false),
  socialLinks: socialLinksSchema.default([]),
});

export type CardContentUpdateInput = z.infer<typeof cardContentUpdateSchema>;

export const cardSettingsUpdateSchema = z.object({
  slug: slugSchema,
  template: cardTemplateSchema,
  theme: themeSchema,
  active: z.boolean().default(true),
  allowPublicWallet: z.boolean().default(true),
});

export type CardSettingsUpdateInput = z.infer<typeof cardSettingsUpdateSchema>;

// ─────────────────────────────────────────────
// Helpers de Sanitización Segura de Enlaces
// ─────────────────────────────────────────────

/**
 * Valida y formatea un enlace externo, permitiendo únicamente protocolo https://
 */
export function sanitizeExternalUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Valida y formatea un enlace tel:
 */
export function sanitizeTelUrl(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned || cleaned.length < 5) return null;
  return `tel:${cleaned}`;
}

/**
 * Valida y formatea un enlace mailto:
 */
export function sanitizeMailtoUrl(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return null;
  return `mailto:${trimmed}`;
}
