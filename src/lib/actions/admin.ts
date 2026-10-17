"use server";

import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/lib/crypto";
import { createInviteSchema } from "@/lib/validations";
import { requireAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────
// Crear invitación (solo ADMIN)
// ─────────────────────────────────────────────
export async function createInviteAction(
  _prevState: unknown,
  formData: FormData
) {
  const admin = await requireAdmin();

  const parsed = createInviteSchema.safeParse({
    email: formData.get("email") ?? "",
    expiresInHours: formData.get("expiresInHours") ?? "48",
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }

  const { email, expiresInHours } = parsed.data;

  const token = generateToken(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  await prisma.invite.create({
    data: {
      tokenHash,
      email: email || null,
      createdById: admin.id,
      expiresAt,
    },
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/invite/${token}`;

  revalidatePath("/admin");
  return { inviteUrl };
}

// ─────────────────────────────────────────────
// Desactivar usuario (solo ADMIN)
// ─────────────────────────────────────────────
export async function toggleUserActiveAction(
  userId: string,
  active: boolean
) {
  const admin = await requireAdmin();

  if (userId === admin.id && !active) {
    return { error: "No puedes desactivar tu propia cuenta de administrador" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { active },
  });

  if (!active) {
    await prisma.session.deleteMany({
      where: { userId },
    });
  }

  revalidatePath("/admin");
  return { success: true };
}

// ─────────────────────────────────────────────
// Generar enlace de reseteo de contraseña (solo ADMIN)
// Solo generamos el invite — el usuario lo usa para setear nueva contraseña.
// No enviamos emails.
// ─────────────────────────────────────────────
export async function generatePasswordResetAction(userId: string) {
  const admin = await requireAdmin();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Usuario no encontrado" };

  const token = generateToken(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  // Reutilizamos el modelo Invite para reseteos
  await prisma.invite.create({
    data: {
      tokenHash,
      email: user.email,
      createdById: admin.id,
      expiresAt,
    },
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/invite/${token}`;

  return { resetUrl };
}
