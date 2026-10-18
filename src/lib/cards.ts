import { RESERVED_SLUGS } from "@/lib/validations";

/** Máximo de tarjetas que puede tener una misma cuenta. */
export const MAX_CARDS_PER_USER = 5;

/** Tamaño máximo de imagen por tipo (lo usan el servidor y el navegador). */
export const IMAGE_MAX_BYTES = {
  avatar: 2 * 1024 * 1024,
  banner: 4 * 1024 * 1024,
} as const;

/** Convierte un texto en un slug válido (minúsculas, números y guiones; sin acentos). */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 26)
    .replace(/-+$/g, "");
}

/**
 * Genera candidatos de slug para una tarjeta nueva. El intento 0 usa el texto base
 * y los siguientes añaden un sufijo numérico aleatorio para evitar colisiones.
 */
export function buildSlugCandidate(
  base: string,
  attempt: number,
  random: () => number = Math.random
): string {
  let root = slugify(base);
  if (root.length < 3 || RESERVED_SLUGS.has(root)) root = "tarjeta";
  if (attempt === 0 && !RESERVED_SLUGS.has(root)) return root;
  const suffix = Math.floor(1000 + random() * 9000);
  return `${root}-${suffix}`;
}
