import { isIP } from "node:net";

/**
 * Extracción segura de la IP del cliente detrás de Traefik (Dokploy).
 *
 * Traefik añade al final de X-Forwarded-For la IP del peer que le conectó. Todo lo que hay a su
 * izquierda lo puede haber escrito el cliente, así que NUNCA se usa el primer valor: se cuenta
 * desde la derecha según TRUSTED_PROXY_HOPS (número de proxies de confianza delante de la app,
 * por defecto 1 = solo Traefik).
 *
 *   XFF = "1.2.3.4 (falsificado), 203.0.113.9"   hops=1 → 203.0.113.9
 *   XFF = "203.0.113.9, 10.0.0.5"                 hops=2 → 203.0.113.9
 */

const FALLBACK_IP = "127.0.0.1";

export function getTrustedProxyHops(): number {
  const hops = Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? "", 10);
  return Number.isInteger(hops) && hops >= 1 ? hops : 1;
}

export function extractClientIp(
  headersMap: { get: (name: string) => string | null },
  hops: number = getTrustedProxyHops()
): string {
  const forwardedFor = headersMap.get("x-forwarded-for");
  if (!forwardedFor) return FALLBACK_IP;

  const chain = forwardedFor.split(",").map((part) => part.trim());
  // Si hay menos entradas que saltos configurados se usa la más a la izquierda disponible,
  // que sigue siendo la que dejó un proxy de confianza (nunca se lee más allá del inicio).
  const index = Math.max(chain.length - hops, 0);
  const candidate = chain[index];

  return candidate && isIP(candidate) !== 0 ? candidate : FALLBACK_IP;
}
