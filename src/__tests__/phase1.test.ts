import { describe, it, expect } from "vitest";
import {
  slugSchema,
  RESERVED_SLUGS,
  loginSchema,
  registerSchema,
} from "@/lib/validations";
import { generateToken, hashToken, timingSafeEqual } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";

// ─────────────────────────────────────────────
// slugSchema
// ─────────────────────────────────────────────
describe("slugSchema", () => {
  it("acepta slugs válidos", () => {
    expect(slugSchema.safeParse("juan-garcia").success).toBe(true);
    expect(slugSchema.safeParse("abc").success).toBe(true);
    expect(slugSchema.safeParse("user-123").success).toBe(true);
    expect(slugSchema.safeParse("a1b2c3").success).toBe(true);
  });

  it("rechaza slug demasiado corto", () => {
    expect(slugSchema.safeParse("j").success).toBe(false);
    expect(slugSchema.safeParse("jg").success).toBe(false);
  });

  it("rechaza slugs con mayúsculas", () => {
    expect(slugSchema.safeParse("JuanGarcia").success).toBe(false);
  });

  it("rechaza slugs que empiezan o terminan con guión", () => {
    expect(slugSchema.safeParse("-abc").success).toBe(false);
    expect(slugSchema.safeParse("abc-").success).toBe(false);
  });

  it("rechaza slugs reservados", () => {
    for (const reserved of RESERVED_SLUGS) {
      expect(slugSchema.safeParse(reserved).success).toBe(false);
    }
  });

  it("rechaza slugs con caracteres especiales", () => {
    expect(slugSchema.safeParse("juan_garcia").success).toBe(false);
    expect(slugSchema.safeParse("juan.garcia").success).toBe(false);
    expect(slugSchema.safeParse("juan garcia").success).toBe(false);
  });

  it("rechaza slugs demasiado largos", () => {
    expect(slugSchema.safeParse("a".repeat(33)).success).toBe(false);
    expect(slugSchema.safeParse("a".repeat(32)).success).toBe(true);
  });
});

// ─────────────────────────────────────────────
// loginSchema
// ─────────────────────────────────────────────
describe("loginSchema", () => {
  it("acepta credenciales válidas", () => {
    const r = loginSchema.safeParse({
      email: "test@example.com",
      password: "mypassword",
    });
    expect(r.success).toBe(true);
  });

  it("normaliza email a minúsculas", () => {
    const r = loginSchema.safeParse({
      email: "  TEST@EXAMPLE.COM  ",
      password: "x",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("test@example.com");
  });

  it("rechaza email inválido", () => {
    expect(
      loginSchema.safeParse({ email: "notanemail", password: "x" }).success
    ).toBe(false);
  });

  it("rechaza contraseña vacía", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "" }).success
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────
// registerSchema
// ─────────────────────────────────────────────
describe("registerSchema", () => {
  const valid = {
    name: "Juan García",
    password: "SuperSecret123!",
    confirmPassword: "SuperSecret123!",
    slug: "juan-garcia",
  };

  it("acepta datos válidos", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza contraseña demasiado corta", () => {
    expect(
      registerSchema.safeParse({ ...valid, password: "short", confirmPassword: "short" }).success
    ).toBe(false);
  });

  it("rechaza contraseñas que no coinciden", () => {
    expect(
      registerSchema.safeParse({ ...valid, confirmPassword: "OtherPass123!" }).success
    ).toBe(false);
  });

  it("rechaza slug reservado", () => {
    expect(
      registerSchema.safeParse({ ...valid, slug: "admin" }).success
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────
// crypto utils
// ─────────────────────────────────────────────
describe("crypto utils", () => {
  it("generateToken produce hex de 64 chars (32 bytes)", () => {
    const token = generateToken(32);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashToken es determinista", () => {
    const token = "testtoken";
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("hashToken produce valores distintos para tokens distintos", () => {
    expect(hashToken("aaa")).not.toBe(hashToken("bbb"));
  });

  it("timingSafeEqual funciona correctamente", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "ab")).toBe(false);
  });
});

// ─────────────────────────────────────────────
// rate limiter
// ─────────────────────────────────────────────
describe("rateLimit", () => {
  it("permite peticiones dentro del límite", () => {
    const key = `test-allow-${Date.now()}`;
    const config = { windowMs: 60_000, max: 3 };

    expect(rateLimit(key, config).allowed).toBe(true);
    expect(rateLimit(key, config).allowed).toBe(true);
    expect(rateLimit(key, config).allowed).toBe(true);
  });

  it("bloquea cuando se supera el límite", () => {
    const key = `test-block-${Date.now()}`;
    const config = { windowMs: 60_000, max: 2 };

    rateLimit(key, config); // 1
    rateLimit(key, config); // 2
    expect(rateLimit(key, config).allowed).toBe(false); // 3 — bloqueado
  });

  it("devuelve remaining correcto", () => {
    const key = `test-remaining-${Date.now()}`;
    const config = { windowMs: 60_000, max: 5 };

    const r1 = rateLimit(key, config);
    expect(r1.remaining).toBe(4);

    const r2 = rateLimit(key, config);
    expect(r2.remaining).toBe(3);
  });
});
