"use server";

import { prisma } from "@/lib/prisma";
import {
  setSessionCookie,
  destroySession,
  regenerateSession,
} from "@/lib/session";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations";
import argon2 from "argon2";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { extractClientIp } from "@/lib/ip";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Obtiene la IP del cliente para rate limiting */
async function getClientIp(): Promise<string> {
  const headersList = await headers();
  return extractClientIp(headersList);
}

/** Respuesta de error genérica */
function authError() {
  return { error: "Email o contraseña incorrectos" };
}

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
export async function loginAction(
  _prevState: unknown,
  formData: FormData
) {
  const ip = await getClientIp();

  // Rate limiting
  const rl = rateLimit(`login:${ip}`, RATE_LIMITS.login);
  if (!rl.allowed) {
    return {
      error: "Demasiados intentos. Inténtalo de nuevo en unos minutos.",
    };
  }

  // Validación
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return authError(); // Mensaje genérico — no revelar qué falló
  }

  const { email, password } = parsed.data;

  // Buscar usuario (sin revelar si el email existe)
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.active) {
    // Simular coste de argon2 para no filtrar timing
    await argon2.verify(
      "$argon2id$v=19$m=65536,t=3,p=4$placeholder$placeholder",
      password
    ).catch(() => {});
    return authError();
  }

  // Verificar contraseña
  let valid = false;
  try {
    valid = await argon2.verify(user.passwordHash, password);
  } catch {
    return authError();
  }

  if (!valid) return authError();

  // Regenerar sesión (prevenir session fixation)
  const token = await regenerateSession(user.id);
  await setSessionCookie(token);

  redirect("/dashboard");
}

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────
export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
