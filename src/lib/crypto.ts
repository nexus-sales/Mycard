import crypto from "crypto";

/**
 * Genera un token criptográficamente seguro de N bytes,
 * codificado en hex.
 */
export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Hashea un token con SHA-256 para guardarlo en BD.
 * El token original viaja en la cookie; solo el hash persiste.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Comparación de strings en tiempo constante para prevenir
 * ataques de timing en comparaciones de tokens/hashes.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Comparamos igualmente para evitar fuga por timing de longitud
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
