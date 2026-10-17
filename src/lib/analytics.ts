/**
 * Detección básica y ligera de bots y crawlers conocidos.
 * Previene que spiders de búsqueda o previsualizaciones de enlaces
 * inflen artificialmente el contador de visitas de las tarjetas.
 */

const BOT_PATTERNS = [
  /bot\b/i,
  /crawler/i,
  /spider/i,
  /crawling/i,
  /facebookexternalhit/i,
  /whatsapp/i,
  /telegrambot/i,
  /twitterbot/i,
  /slackbot/i,
  /discordbot/i,
  /linkedinbot/i,
  /pinterest/i,
  /google/i,
  /bingbot/i,
  /yandex/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yahoo/i,
  /semrush/i,
  /ahrefs/i,
  /mj12bot/i,
  /dotbot/i,
  /preview/i,
  /headless/i,
  /phantomjs/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
];

/**
 * Devuelve true si el User-Agent coincide con algún bot o crawler conocido
 */
export function isLikelyBot(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.trim() === "") return true; // Peticiones sin UA suelen ser scrapers automatizados
  return BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
}
