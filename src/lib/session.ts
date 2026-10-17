import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashToken, generateToken } from "@/lib/crypto";
import type { Role } from "@prisma/client";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "sid";
const SESSION_DURATION =
  parseInt(process.env.SESSION_DURATION_SECONDS ?? "604800") * 1000; // ms

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
}

// ─────────────────────────────────────────────
// Crear sesión
// ─────────────────────────────────────────────
export async function createSession(userId: string): Promise<string> {
  const token = generateToken(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await prisma.session.create({
    data: { userId, tokenHash, expiresAt },
  });

  return token;
}

// ─────────────────────────────────────────────
// Setear cookie de sesión
// ─────────────────────────────────────────────
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION / 1000, // segundos
  });
}

// ─────────────────────────────────────────────
// Obtener sesión actual (desde la cookie)
// ─────────────────────────────────────────────
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    // Sesión expirada — limpiar
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  if (!session.user.active) return null;

  return session.user;
}

// ─────────────────────────────────────────────
// Regenerar sesión (previene session fixation)
// ─────────────────────────────────────────────
export async function regenerateSession(userId: string): Promise<string> {
  const cookieStore = await cookies();
  const oldToken = cookieStore.get(COOKIE_NAME)?.value;

  if (oldToken) {
    const oldHash = hashToken(oldToken);
    await prisma.session.deleteMany({ where: { tokenHash: oldHash } });
  }

  return createSession(userId);
}

// ─────────────────────────────────────────────
// Destruir sesión (logout)
// ─────────────────────────────────────────────
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    const tokenHash = hashToken(token);
    await prisma.session.deleteMany({ where: { tokenHash } }).catch(() => {});
  }

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

// ─────────────────────────────────────────────
// Requerir sesión (helper para Server Components/Actions)
// ─────────────────────────────────────────────
export async function requireSession(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return user;
}
