"use server";

import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/crypto";
import {
  createSession,
  setSessionCookie,
} from "@/lib/session";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validations";
import argon2 from "argon2";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { extractClientIp } from "@/lib/ip";
import { getI18n } from "@/lib/i18n/server";
import { translateFieldErrors, translateValidation } from "@/lib/i18n/dictionaries";

async function getClientIp(): Promise<string> {
  const headersList = await headers();
  return extractClientIp(headersList);
}

// ─────────────────────────────────────────────
// Registrar usuario con token de invitación
// ─────────────────────────────────────────────
export async function registerWithInviteAction(
  inviteToken: string,
  formData: FormData
) {
  const ip = await getClientIp();
  const { t } = await getI18n();

  // Rate limiting
  const rl = rateLimit(`invite:${ip}`, RATE_LIMITS.invite);
  if (!rl.allowed) {
    return {
      error: t.auth.tooManyInvite,
    };
  }

  // Validar form
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return {
      error: translateValidation(t, parsed.error.errors[0]?.message),
      fieldErrors: translateFieldErrors(t, parsed.error.flatten().fieldErrors),
    };
  }

  const { name, password, slug } = parsed.data;

  // Validar invitación
  const tokenHash = hashToken(inviteToken);

  const invite = await prisma.invite.findUnique({ where: { tokenHash } });

  if (
    !invite ||
    invite.usedAt !== null ||
    invite.expiresAt < new Date()
  ) {
    return { error: t.invite.invalidInvite };
  }

  // Comprobar slug único solo si no pertenece al usuario existente
  const existingCardWithSlug = await prisma.card.findUnique({ where: { slug } });

  // Hash de contraseña con argon2id
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });

  // Crear usuario + tarjeta o resetear contraseña en transacción
  let targetUser: { id: string };
  try {
    targetUser = await prisma.$transaction(async (tx) => {
      // Si la invitación tenía email asignado, usarlo; si no, pedir email
      const email = invite.email ?? (formData.get("email") as string | null);
      if (!email) {
        throw new Error("EMAIL_REQUIRED");
      }

      const existingUser = await tx.user.findUnique({ where: { email } });

      // CASO A: Es un reseteo de contraseña de un usuario existente creado por el admin
      if (existingUser && invite.email && invite.email.toLowerCase() === existingUser.email.toLowerCase()) {
        await tx.user.update({
          where: { id: existingUser.id },
          data: { passwordHash, name },
        });

        // Revocar todas las sesiones previas por seguridad
        await tx.session.deleteMany({ where: { userId: existingUser.id } });

        await tx.invite.update({
          where: { id: invite.id },
          data: { usedAt: new Date(), usedById: existingUser.id },
        });

        return existingUser;
      }

      // CASO B: El email ya existe pero no era un invite dirigido a ese email
      if (existingUser) {
        throw new Error("EMAIL_EXISTS");
      }

      // CASO C: Registro de nuevo usuario
      if (existingCardWithSlug) {
        throw new Error("SLUG_EXISTS");
      }

      const user = await tx.user.create({
        data: { email, name, passwordHash, role: "USER" },
      });

      await tx.card.create({
        data: {
          userId: user.id,
          slug,
          template: "MINIMAL",
          theme: {},
          content: {
            create: {
              name,
              email,
            },
          },
        },
      });

      await tx.invite.update({
        where: { id: invite.id },
        data: { usedAt: new Date(), usedById: user.id },
      });

      return user;
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === "EMAIL_REQUIRED") {
        return { error: t.invite.emailRequired, fieldErrors: { email: [t.invite.emailRequiredField] } };
      }
      if (err.message === "EMAIL_EXISTS") {
        return { error: t.invite.emailExists, fieldErrors: {} };
      }
      if (err.message === "SLUG_EXISTS") {
        return { error: t.invite.slugInUse, fieldErrors: { slug: [t.invite.slugInUseField] } };
      }
    }
    console.error("Error en registro:", err);
    return { error: t.invite.internal };
  }

  // Crear sesión
  const token = await createSession(targetUser.id);
  await setSessionCookie(token);

  redirect("/dashboard");
}
