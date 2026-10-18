import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp, { Metadata } from "sharp";

/** Error de subida con código estable; la acción de servidor lo traduce al idioma del usuario. */
export type UploadErrorCode = "tooLarge" | "badFormat" | "corrupt" | "unsupported";

export class UploadError extends Error {
  constructor(
    public readonly code: UploadErrorCode,
    public readonly params: { mb?: number } = {}
  ) {
    super(code);
    this.name = "UploadError";
  }
}

// Directorio base de subidas
const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "./uploads");

// Asegurar que el directorio de subidas existe
async function ensureUploadDir(): Promise<void> {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.error("Error asegurando directorio de subidas:", err);
  }
}

/**
 * Comprueba los "magic bytes" reales de la imagen para evitar
 * archivos maliciosos renombrados con extensión de imagen.
 */
function isValidImageMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  // JPEG: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (isJpeg) return true;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  if (isPng) return true;

  // WebP: RIFF ... WEBP (52 49 46 46 .... 57 45 42 50)
  const isWebp =
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP";
  if (isWebp) return true;

  // GIF: GIF87a / GIF89a
  const isGif = buffer.toString("ascii", 0, 6).startsWith("GIF8");
  if (isGif) return true;

  return false;
}

export type ImageUploadType = "avatar" | "banner";

const LIMITS: Record<ImageUploadType, { maxBytes: number; width: number; height: number }> = {
  avatar: {
    maxBytes: 2 * 1024 * 1024, // 2MB
    width: 400,
    height: 400,
  },
  banner: {
    maxBytes: 4 * 1024 * 1024, // 4MB
    width: 1200,
    height: 400,
  },
};

export interface ProcessedImageResult {
  filename: string;
  publicPath: string;
}

/**
 * Procesa y almacena de forma segura una imagen de avatar o banner:
 * 1. Verifica tamaño máximo permitido
 * 2. Valida magic bytes reales
 * 3. Analiza metadatos con sharp para verificar integridad
 * 4. Redimensiona y convierte a WebP eliminando EXIF/metadatos
 * 5. Genera un nombre de archivo puramente aleatorio (nunca el original)
 * 6. Guarda en el volumen de uploads
 */
export async function processAndSaveImage(
  file: File,
  type: ImageUploadType
): Promise<ProcessedImageResult> {
  const config = LIMITS[type];

  // 1. Validar tamaño de payload
  if (file.size > config.maxBytes) {
    const mb = Math.round(config.maxBytes / (1024 * 1024));
    throw new UploadError("tooLarge", { mb });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 2. Validar magic bytes reales
  if (!isValidImageMagicBytes(buffer)) {
    throw new UploadError("badFormat");
  }

  // 3. Inspeccionar con sharp (falla si el archivo está corrupto o es un polyglot)
  let metadata: Metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    throw new UploadError("corrupt");
  }

  const allowedFormats = ["jpeg", "png", "webp", "gif"];
  if (!metadata.format || !allowedFormats.includes(metadata.format)) {
    throw new UploadError("unsupported");
  }

  await ensureUploadDir();

  // 4. Generar nombre aleatorio criptográfico (32 hex + .webp)
  const randomName = `${crypto.randomBytes(16).toString("hex")}.webp`;
  const destinationPath = path.join(UPLOAD_DIR, randomName);

  // 5. Reprocesar con sharp: redimensionar, convertir a webp, eliminar EXIF
  await sharp(buffer)
    .resize(config.width, config.height, {
      fit: "cover",
      position: "center",
      withoutEnlargement: false,
    })
    .webp({ quality: 85 })
    .toFile(destinationPath);

  return {
    filename: randomName,
    publicPath: `/api/uploads/${randomName}`,
  };
}

/**
 * Elimina un archivo anterior de forma segura (previene Path Traversal)
 */
export async function deleteOldImage(publicPath: string | null | undefined): Promise<void> {
  if (!publicPath) return;

  const match = publicPath.match(/^\/api\/uploads\/([a-f0-9]{32}\.webp)$/);
  if (!match) return;

  const filename = match[1];
  const targetPath = path.join(UPLOAD_DIR, filename);

  try {
    await fs.unlink(targetPath);
  } catch (err: unknown) {
    // Si no existe, no es un error crítico
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("No se pudo eliminar la imagen previa:", err);
    }
  }
}

/**
 * Obtiene la ruta física segura de un archivo de upload existente
 */
export function getSafeUploadFilePath(filename: string): string | null {
  // Solo permitimos exactamente 32 caracteres hexadecimales + .webp
  if (!/^[a-f0-9]{32}\.webp$/.test(filename)) {
    return null;
  }

  const resolved = path.resolve(UPLOAD_DIR, filename);
  // Mitigación de Path Traversal
  if (!resolved.startsWith(UPLOAD_DIR)) {
    return null;
  }

  return resolved;
}
