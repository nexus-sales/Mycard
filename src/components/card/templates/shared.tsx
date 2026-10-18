import React from "react";
import {
  CardTheme,
  sanitizeExternalUrl,
  sanitizeMailtoUrl,
  sanitizeTelUrl,
} from "@/lib/validations";
import { getContrastRatio } from "@/lib/qr";

/** Props comunes a las plantillas nuevas (Luminosa, Impacto y Editorial). */
export interface TemplateProps {
  card?: {
    slug: string;
    active: boolean;
    allowPublicWallet?: boolean;
  };
  content: {
    name: string;
    jobTitle?: string | null;
    company?: string | null;
    bio?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    address?: string | null;
    avatarPath?: string | null;
    bannerPath?: string | null;
    showPhone: boolean;
    showEmail: boolean;
    showAddress: boolean;
    socialLinks: Array<{ platform: string; url: string }>;
  };
  theme: CardTheme;
  shareUrl: string;
  vcardUrl?: string;
  isOwner?: boolean;
}

export function fontClassFor(theme: CardTheme): string {
  return theme.fontFamily === "serif"
    ? "font-serif"
    : theme.fontFamily === "mono"
    ? "font-mono"
    : "font-sans";
}

export type ContactKind = "email" | "phone" | "web" | "address";

export interface ContactItem {
  kind: ContactKind;
  /** Texto visible */
  value: string;
  /** Enlace ya saneado (null si no es un enlace, p. ej. la dirección) */
  href: string | null;
  external: boolean;
}

/** Datos de contacto visibles, con los enlaces saneados (solo https, tel: y mailto:). */
export function buildContactItems(content: TemplateProps["content"]): ContactItem[] {
  const items: ContactItem[] = [];

  const mailto = sanitizeMailtoUrl(content.email);
  if (content.showEmail && content.email && mailto) {
    items.push({ kind: "email", value: content.email, href: mailto, external: false });
  }

  const tel = sanitizeTelUrl(content.phone);
  if (content.showPhone && content.phone && tel) {
    items.push({ kind: "phone", value: content.phone, href: tel, external: false });
  }

  const web = sanitizeExternalUrl(content.website);
  if (web) {
    items.push({
      kind: "web",
      value: (content.website ?? "").replace(/^https?:\/\//, ""),
      href: web,
      external: true,
    });
  }

  if (content.showAddress && content.address) {
    items.push({ kind: "address", value: content.address, href: null, external: false });
  }

  return items;
}

const ICON_PATHS: Record<ContactKind, string[]> = {
  email: ["M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"],
  phone: ["M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"],
  web: ["M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"],
  address: [
    "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z",
    "M15 11a3 3 0 11-6 0 3 3 0 016 0z",
  ],
};

export function ContactIcon({ kind, className = "w-4 h-4" }: { kind: ContactKind; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      {ICON_PATHS[kind].map((d) => (
        <path key={d} strokeLinecap="round" strokeLinejoin="round" d={d} />
      ))}
    </svg>
  );
}

/**
 * Devuelve `color` si se lee bien (contraste >= 3:1) sobre `background`;
 * si no, `fallback`. Evita, por ejemplo, un enlace amarillo sobre fondo claro.
 */
export function legibleOn(background: string, color: string, fallback: string): string {
  return getContrastRatio(background, color) >= 3 ? color : fallback;
}

export function initialsOf(name: string, fallback: string): string {
  return name.trim().slice(0, 2).toUpperCase() || fallback;
}
