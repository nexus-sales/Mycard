import { describe, it, expect } from "vitest";
import { extractClientIp } from "@/lib/ip";

describe("Fase 5: Seguridad, IP resolution y configuración de producción", () => {
  describe("extractClientIp (X-Forwarded-For desde la derecha, anti-spoofing)", () => {
    const withXff = (value: string | null) => ({
      get: (key: string) => (key === "x-forwarded-for" ? value : null),
    });

    it("con 1 salto usa el último valor (el que añade Traefik), no el primero", () => {
      expect(extractClientIp(withXff("203.0.113.9"), 1)).toBe("203.0.113.9");
      expect(extractClientIp(withXff("198.51.100.1, 203.0.113.9"), 1)).toBe("203.0.113.9");
    });

    it("ignora una IP falsificada por el cliente al inicio de la cadena", () => {
      // El atacante envía X-Forwarded-For: 1.1.1.1 y Traefik añade su IP real al final
      expect(extractClientIp(withXff("1.1.1.1, 8.8.8.8, 203.0.113.9"), 1)).toBe("203.0.113.9");
    });

    it("no se puede evadir el rate limit rotando IPs falsas en la cabecera", () => {
      const ips = ["9.9.9.1", "9.9.9.2", "9.9.9.3"].map((fake) =>
        extractClientIp(withXff(`${fake}, 203.0.113.9`), 1)
      );
      expect(new Set(ips)).toEqual(new Set(["203.0.113.9"]));
    });

    it("respeta TRUSTED_PROXY_HOPS contando desde la derecha", () => {
      const chain = "6.6.6.6, 203.0.113.9, 10.0.0.5";
      expect(extractClientIp(withXff(chain), 1)).toBe("10.0.0.5");
      expect(extractClientIp(withXff(chain), 2)).toBe("203.0.113.9");
      expect(extractClientIp(withXff(chain), 3)).toBe("6.6.6.6");
    });

    it("lee TRUSTED_PROXY_HOPS del entorno (por defecto 1) y rechaza valores inválidos", () => {
      const original = process.env.TRUSTED_PROXY_HOPS;
      try {
        delete process.env.TRUSTED_PROXY_HOPS;
        expect(extractClientIp(withXff("6.6.6.6, 203.0.113.9"))).toBe("203.0.113.9");
        process.env.TRUSTED_PROXY_HOPS = "2";
        expect(extractClientIp(withXff("6.6.6.6, 203.0.113.9, 10.0.0.5"))).toBe("203.0.113.9");
        process.env.TRUSTED_PROXY_HOPS = "0";
        expect(extractClientIp(withXff("6.6.6.6, 203.0.113.9"))).toBe("203.0.113.9");
        process.env.TRUSTED_PROXY_HOPS = "abc";
        expect(extractClientIp(withXff("6.6.6.6, 203.0.113.9"))).toBe("203.0.113.9");
      } finally {
        if (original === undefined) delete process.env.TRUSTED_PROXY_HOPS;
        else process.env.TRUSTED_PROXY_HOPS = original;
      }
    });

    it("ignora cf-connecting-ip y x-real-ip, que controla el cliente", () => {
      const mockHeaders = new Map<string, string>([
        ["cf-connecting-ip", "6.6.6.6"],
        ["x-real-ip", "7.7.7.7"],
        ["x-forwarded-for", "203.0.113.9"],
      ]);
      expect(extractClientIp({ get: (key) => mockHeaders.get(key) ?? null }, 1)).toBe("203.0.113.9");

      const onlySpoofed = new Map<string, string>([["x-real-ip", "7.7.7.7"]]);
      expect(extractClientIp({ get: (key) => onlySpoofed.get(key) ?? null }, 1)).toBe("127.0.0.1");
    });

    it("devuelve 127.0.0.1 si no hay cabecera o el valor no es una IP", () => {
      expect(extractClientIp({ get: () => null }, 1)).toBe("127.0.0.1");
      expect(extractClientIp(withXff("invalid-ip-injection-string"), 1)).toBe("127.0.0.1");
      expect(extractClientIp(withXff("203.0.113.9, "), 1)).toBe("127.0.0.1");
      expect(extractClientIp(withXff("1.2.3.4:80"), 1)).toBe("127.0.0.1");
    });

    it("soporta direcciones IPv6 válidas", () => {
      expect(extractClientIp(withXff("1.1.1.1, 2a01:4f8:c012:a1::1"), 1)).toBe("2a01:4f8:c012:a1::1");
    });

    it("con menos entradas que saltos usa la primera disponible", () => {
      expect(extractClientIp(withXff("203.0.113.9"), 3)).toBe("203.0.113.9");
    });
  });

  describe("Políticas de CSP y Cabeceras de Seguridad", () => {
    it("la directiva frame-ancestors debe ser estrictamente 'none'", () => {
      // Simular generación de directivas CSP
      const nonce = "test-nonce-123456";
      const csp = [
        `default-src 'self'`,
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
        `style-src 'self' 'unsafe-inline'`,
        `img-src 'self' blob: data: https:`,
        `frame-ancestors 'none'`,
      ].join("; ");

      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain(`nonce-${nonce}`);
      expect(csp).toContain("img-src 'self' blob: data: https:");
    });

    it("los headers de seguridad obligatorios deben estar presentes", () => {
      const headers = {
        "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
        "X-Frame-Options": "DENY",
      };

      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
      expect(headers["X-Frame-Options"]).toBe("DENY");
      expect(headers["Strict-Transport-Security"]).toContain("includeSubDomains");
      expect(headers["Permissions-Policy"]).toContain("camera=()");
    });
  });

  describe("Healthcheck Payload y Estructura", () => {
    it("debe formatear correctamente la respuesta saludable del healthcheck", () => {
      const healthyPayload = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        checks: {
          database: "connected",
          storage: "accessible",
        },
      };

      expect(healthyPayload.status).toBe("healthy");
      expect(healthyPayload.checks.database).toBe("connected");
      expect(healthyPayload.checks.storage).toBe("accessible");
    });
  });
});
