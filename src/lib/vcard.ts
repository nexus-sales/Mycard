import sharp from "sharp";
import fs from "fs/promises";
import { getSafeUploadFilePath } from "@/lib/upload";

/**
 * Escapa valores de texto para vCard según RFC 2426 / 6350.
 * Previene completamente inyecciones de nuevas líneas o terminadores de bloque (END:VCARD).
 */
export function escapeVCardValue(value: string | null | undefined): string {
  if (!value) return "";

  return (
    value
      // 1. Escapar barras invertidas primero
      .replace(/\\/g, "\\\\")
      // 2. Escapar punto y coma y comas
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      // 3. Convertir cualquier salto de línea real (CRLF, CR, LF) en el literal \n
      // Esto neutraliza cualquier intento de inyección de líneas ("END:VCARD", etc.)
      .replace(/\r\n|\r|\n/g, "\\n")
      .trim()
  );
}

/**
 * Pliega líneas largas que superen los 75 caracteres según RFC 2426 / RFC 6350.
 * Inserta CRLF seguido de un espacio.
 */
export function foldVCardLine(line: string, maxOctets = 75): string {
  if (line.length <= maxOctets) {
    return line;
  }

  const parts: string[] = [];
  let remaining = line;

  // Primera línea: hasta maxOctets
  parts.push(remaining.slice(0, maxOctets));
  remaining = remaining.slice(maxOctets);

  // Líneas siguientes: máx (maxOctets - 1) porque empiezan con un espacio
  while (remaining.length > 0) {
    const chunk = remaining.slice(0, maxOctets - 1);
    parts.push(` ${chunk}`);
    remaining = remaining.slice(maxOctets - 1);
  }

  return parts.join("\r\n");
}

export interface VCardContactData {
  slug: string;
  name: string;
  jobTitle?: string | null;
  company?: string | null;
  bio?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  avatarPath?: string | null;
  showPhone: boolean;
  showEmail: boolean;
  showAddress: boolean;
  socialLinks?: Array<{ platform: string; url: string }> | null;
}

/**
 * Procesa y optimiza la imagen de avatar para embeberla en el vCard
 * solo si es ligera (redimensionada a 120x120 JPEG con bajo peso).
 */
async function getVCardPhotoBase64(avatarPath: string | null | undefined): Promise<string | null> {
  if (!avatarPath) return null;

  const match = avatarPath.match(/^\/api\/uploads\/([a-f0-9]{32}\.webp)$/);
  if (!match) return null;

  const physicalPath = getSafeUploadFilePath(match[1]);
  if (!physicalPath) return null;

  try {
    const buffer = await fs.readFile(physicalPath);
    // Redimensionar a miniatura para no sobrecargar el vCard (máx ~15KB)
    const smallThumb = await sharp(buffer)
      .resize(120, 120, { fit: "cover" })
      .jpeg({ quality: 75 })
      .toBuffer();

    // Solo incluir si es razonablemente pequeño
    if (smallThumb.length > 30 * 1024) {
      return null;
    }

    return smallThumb.toString("base64");
  } catch (err) {
    console.warn("No se pudo procesar la foto para el vCard:", err);
    return null;
  }
}

/**
 * Genera el string formateado del vCard 3.0 con CRLF y plegado de líneas.
 */
export async function generateVCardString(data: VCardContactData): Promise<string> {
  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
  ];

  // Nombre (N) y Nombre Formateado (FN)
  const escapedName = escapeVCardValue(data.name);
  // Intentar separar Apellidos y Nombre para el campo estructurado N
  const nameParts = data.name.trim().split(/\s+/);
  let nValue = "";
  if (nameParts.length >= 2) {
    const firstName = escapeVCardValue(nameParts[0]);
    const lastName = escapeVCardValue(nameParts.slice(1).join(" "));
    nValue = `${lastName};${firstName};;;`;
  } else {
    nValue = `${escapedName};;;;`;
  }

  lines.push(`N:${nValue}`);
  lines.push(`FN:${escapedName}`);

  // Empresa y Cargo
  if (data.company?.trim()) {
    lines.push(`ORG:${escapeVCardValue(data.company)}`);
  }
  if (data.jobTitle?.trim()) {
    lines.push(`TITLE:${escapeVCardValue(data.jobTitle)}`);
  }

  // Nota / Bio
  if (data.bio?.trim()) {
    lines.push(`NOTE:${escapeVCardValue(data.bio)}`);
  }

  // Teléfono (solo si showPhone es true)
  if (data.showPhone && data.phone?.trim()) {
    const cleanedPhone = data.phone.replace(/[^\d+]/g, "");
    if (cleanedPhone) {
      lines.push(`TEL;TYPE=CELL,VOICE:${cleanedPhone}`);
    }
  }

  // Email (solo si showEmail es true)
  if (data.showEmail && data.email?.trim()) {
    lines.push(`EMAIL;TYPE=INTERNET,PREF:${escapeVCardValue(data.email)}`);
  }

  // Sitio web
  if (data.website?.trim() && data.website.startsWith("https://")) {
    lines.push(`URL;TYPE=WORK:${escapeVCardValue(data.website)}`);
  }

  // Dirección (solo si showAddress es true)
  if (data.showAddress && data.address?.trim()) {
    lines.push(`ADR;TYPE=WORK:;;${escapeVCardValue(data.address)};;;;`);
  }

  // Redes sociales
  if (Array.isArray(data.socialLinks)) {
    for (const social of data.socialLinks) {
      if (social.url?.startsWith("https://")) {
        const safePlatform = escapeVCardValue(social.platform || "Social");
        lines.push(`X-SOCIALPROFILE;TYPE=${safePlatform}:${escapeVCardValue(social.url)}`);
      }
    }
  }

  // Foto embebida pequeña opcional
  const photoBase64 = await getVCardPhotoBase64(data.avatarPath);
  if (photoBase64) {
    lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${photoBase64}`);
  }

  // Timestamp de revisión
  lines.push(`REV:${new Date().toISOString()}`);
  lines.push("END:VCARD");

  // Aplicar plegado de líneas (folding) y saltos CRLF según RFC
  return lines.map((line) => foldVCardLine(line, 75)).join("\r\n") + "\r\n";
}
