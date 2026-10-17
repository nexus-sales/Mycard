import { describe, it, expect } from "vitest";
import { RESERVED_SLUGS, slugSchema } from "@/lib/validations";

describe("Reglas de autorización y slugs reservados", () => {
  it("contiene los slugs críticos del sistema", () => {
    const criticalSlugs = ["admin", "api", "dashboard", "invite", "login", "c"];
    for (const slug of criticalSlugs) {
      expect(RESERVED_SLUGS.has(slug)).toBe(true);
      expect(slugSchema.safeParse(slug).success).toBe(false);
    }
  });

  it("rechaza variaciones de rutas protegidas", () => {
    expect(slugSchema.safeParse("admin").success).toBe(false);
    expect(slugSchema.safeParse("dashboard").success).toBe(false);
    expect(slugSchema.safeParse("settings").success).toBe(false);
    expect(slugSchema.safeParse("api").success).toBe(false);
  });
});

describe("Lógica de estado y expiración de invitaciones", () => {
  function isInviteValid(invite: {
    usedAt: Date | null;
    expiresAt: Date;
  }): boolean {
    if (invite.usedAt !== null) return false;
    if (invite.expiresAt.getTime() < Date.now()) return false;
    return true;
  }

  it("acepta una invitación no usada y no caducada", () => {
    const invite = {
      usedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60), // +1h
    };
    expect(isInviteValid(invite)).toBe(true);
  });

  it("rechaza una invitación ya usada", () => {
    const invite = {
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    };
    expect(isInviteValid(invite)).toBe(false);
  });

  it("rechaza una invitación caducada", () => {
    const invite = {
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000 * 60), // -1m
    };
    expect(isInviteValid(invite)).toBe(false);
  });
});
