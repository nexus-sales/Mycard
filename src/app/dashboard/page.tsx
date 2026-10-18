import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { listUserCards } from "@/lib/actions/card";
import { getI18n } from "@/lib/i18n/server";
import { MAX_CARDS_PER_USER } from "@/lib/cards";
import { defaultTheme } from "@/lib/validations";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import CardList, { type CardSummary } from "@/components/dashboard/CardList";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.dashboard, robots: { index: false, follow: false } };
}

export default async function DashboardPage() {
  const user = await requireSession();
  const { t } = await getI18n();
  const cards = await listUserCards();

  const summaries: CardSummary[] = cards.map((card) => {
    const theme = (card.theme && typeof card.theme === "object" ? card.theme : {}) as { primaryColor?: string };
    return {
      id: card.id,
      slug: card.slug,
      active: card.active,
      views: card.views,
      template: card.template,
      name: card.content?.name ?? "",
      jobTitle: card.content?.jobTitle ?? "",
      company: card.content?.company ?? "",
      primaryColor: theme.primaryColor || defaultTheme.primaryColor,
    };
  });

  return (
    <main className="min-h-screen bg-paper text-ink">
      <DashboardHeader user={user} t={t} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <CardList cards={summaries} max={MAX_CARDS_PER_USER} />
      </div>
    </main>
  );
}
