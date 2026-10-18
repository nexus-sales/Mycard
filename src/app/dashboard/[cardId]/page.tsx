import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getUserCard } from "@/lib/actions/card";
import { getI18n } from "@/lib/i18n/server";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import CardEditor from "@/components/dashboard/CardEditor";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.editor.title, robots: { index: false, follow: false } };
}

export default async function EditCardPage({ params }: { params: Promise<{ cardId: string }> }) {
  const user = await requireSession();
  const { t } = await getI18n();
  const { cardId } = await params;

  // getUserCard solo devuelve tarjetas de la cuenta autenticada: un id ajeno da 404
  const card = await getUserCard(cardId);
  if (!card) notFound();

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return (
    <main className="min-h-screen bg-paper text-ink">
      <DashboardHeader user={user} t={t} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex text-sm font-semibold text-sea hover:underline"
        >
          {t.dashboard.back}
        </Link>
        <CardEditor
          initialCard={{
            id: card.id,
            slug: card.slug,
            template: card.template,
            theme: card.theme,
            active: card.active,
            allowPublicWallet: card.allowPublicWallet,
            views: card.views,
            content: card.content,
          }}
          appUrl={appUrl}
        />
      </div>
    </main>
  );
}
