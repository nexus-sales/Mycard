import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/crypto";
import InviteForm from "@/components/auth/InviteForm";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;

  // Validar token sin consumirlo aún (la acción lo consume)
  const tokenHash = hashToken(token);
  const invite = await prisma.invite.findUnique({ where: { tokenHash } });

  if (!invite || invite.usedAt !== null || invite.expiresAt < new Date()) {
    notFound();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-100">
      <div aria-hidden="true" className="absolute left-1/2 top-[-16rem] h-[32rem] w-[44rem] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mx-auto mb-8 flex w-fit items-center gap-2.5 font-bold text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/15 text-sm text-indigo-300">MC</span>
          MyCard
        </Link>
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold text-white">Crea tu cuenta</h1>
          <p className="mt-2 text-sm text-slate-400">Configura tus datos de acceso y la dirección inicial de tu tarjeta.</p>
        </div>
        {invite.email && (
          <p className="mb-4 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-center text-sm text-indigo-200">
            Invitación para <span className="font-semibold">{invite.email}</span>
          </p>
        )}
        <InviteForm
          inviteToken={token}
          prefilledEmail={invite.email ?? undefined}
        />
      </div>
    </main>
  );
}
