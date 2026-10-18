import { describe, it, expect } from "vitest";
import { MAX_CARDS_PER_USER, buildSlugCandidate, slugify } from "@/lib/cards";
import { slugSchema } from "@/lib/validations";

describe("Varias tarjetas por cuenta", () => {
  it("el límite por cuenta es 5", () => {
    expect(MAX_CARDS_PER_USER).toBe(5);
  });

  describe("slugify", () => {
    it("quita acentos y símbolos", () => {
      expect(slugify("Salvador Muñoz Portillo")).toBe("salvador-munoz-portillo");
      expect(slugify("  Ñandú & Co.  ")).toBe("nandu-co");
    });

    it("recorta a un máximo seguro y no deja guiones al final", () => {
      const result = slugify("a".repeat(10) + " " + "b".repeat(40));
      expect(result.length).toBeLessThanOrEqual(26);
      expect(result.endsWith("-")).toBe(false);
    });

    it("devuelve cadena vacía si no hay caracteres válidos", () => {
      expect(slugify("¡¡¡")).toBe("");
    });
  });

  describe("buildSlugCandidate", () => {
    it("el primer intento usa el texto base", () => {
      expect(buildSlugCandidate("Salvador Muñoz", 0)).toBe("salvador-munoz");
    });

    it("los siguientes intentos añaden un sufijo numérico", () => {
      expect(buildSlugCandidate("Salvador", 1, () => 0)).toBe("salvador-1000");
      expect(buildSlugCandidate("Salvador", 2, () => 0.9999)).toBe("salvador-9999");
    });

    it("usa 'tarjeta' si el nombre no sirve o es una ruta reservada", () => {
      expect(buildSlugCandidate("!!", 0)).toBe("tarjeta");
      expect(buildSlugCandidate("ab", 0)).toBe("tarjeta");
      expect(buildSlugCandidate("Admin", 0, () => 0)).toBe("tarjeta");
      expect(buildSlugCandidate("Dashboard", 1, () => 0)).toBe("tarjeta-1000");
    });

    it("todos los candidatos pasan la validación de slug", () => {
      const names = ["Salvador Muñoz Portillo", "Zoë", "李雷", "a", "  ", "Admin", "x".repeat(80), "Ana-María_López"];
      for (const name of names) {
        for (const attempt of [0, 1, 5]) {
          const slug = buildSlugCandidate(name, attempt);
          expect(slugSchema.safeParse(slug).success, `${name} / ${attempt} → ${slug}`).toBe(true);
        }
      }
    });
  });
});
