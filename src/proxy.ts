import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "sid";

// Rutas que requieren autenticación
const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/settings"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDev = process.env.NODE_ENV === "development";

  // 1. Generar nonce criptográfico para CSP
  // Usamos btoa y crypto.randomUUID() compatibles universalmente con Edge y Node.js
  const nonce = btoa(crypto.randomUUID());

  // 2. Construir Content Security Policy estricta
  // - script-src: 'self', nonce dinámico y 'strict-dynamic'. En desarrollo se añade 'unsafe-eval' para Fast Refresh.
  // - style-src: 'self', 'unsafe-inline' (para propiedades style={{}} reactivas de temas) y Google Fonts.
  // - img-src: 'self', blob:, data: y https: (permite uploads, previsualización WebP y logos).
  // - connect-src: 'self' y endpoints de Google Pay / Wallet.
  // - frame-ancestors: 'none' (mitiga Clickjacking).
  const scriptDirectives = isDev
    ? `'self' 'unsafe-eval' 'nonce-${nonce}'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  const cspDirectives = [
    `default-src 'self'`,
    `script-src ${scriptDirectives}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://pay.google.com https://walletobjects.googleapis.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  // 3. Cabeceras de petición con x-nonce para que Next.js App Router inyecte el nonce en sus scripts
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspDirectives);

  // Helper para adjuntar el set completo de cabeceras de seguridad
  const applySecurityHeaders = (response: NextResponse): NextResponse => {
    response.headers.set("Content-Security-Policy", cspDirectives);
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=()"
    );
    response.headers.set("X-Frame-Options", "DENY");
    return response;
  };

  // 4. Verificación de rutas protegidas
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtected) {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      const redirectRes = NextResponse.redirect(loginUrl);
      return applySecurityHeaders(redirectRes);
    }

    // Formato de token: 32 bytes hex = 64 caracteres
    const isValidFormat = /^[0-9a-f]{64}$/.test(token);
    if (!isValidFormat) {
      const loginUrl = new URL("/login", request.url);
      const redirectRes = NextResponse.redirect(loginUrl);
      redirectRes.cookies.delete(COOKIE_NAME);
      return applySecurityHeaders(redirectRes);
    }
  }

  // 5. Respuesta normal con request headers actualizados
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas excepto archivos estáticos internos de Next.js y favicon
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
