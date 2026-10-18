import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/crypto";
import InviteForm from "@/components/auth/InviteForm";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.invite };
}

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const { t } = await getI18n();

  // Validar token sin consumirlo aún (la acción lo consume)
  const tokenHash = hashToken(token);
  const invite = await prisma.invite.findUnique({ where: { tokenHash } });

  if (!invite || invite.usedAt !== null || invite.expiresAt < new Date()) {
    notFound();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper px-4 py-10 text-ink">
      <div className="absolute right-4 top-4 z-10"><LanguageSwitcher /></div>
      <div aria-hidden="true" className="absolute left-1/2 top-[-16rem] h-[32rem] w-[44rem] -translate-x-1/2 rounded-full bg-sea/20 blur-3xl" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mx-auto mb-8 flex w-fit items-center gap-2.5 font-bold text-ink">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-voltio text-sm font-black text-basalto">MC</span>
          MyCard
        </Link>
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold text-ink">{t.invite.title}</h1>
          <p className="mt-2 text-sm text-ink-2">{t.invite.subtitle}</p>
        </div>
        {invite.email && (
          <p className="mb-4 rounded-xl border border-sea/20 bg-sea/10 px-4 py-3 text-center text-sm text-sea">
            {fmt(t.invite.invitationFor, { email: "" })}<span className="font-semibold">{invite.email}</span>
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
