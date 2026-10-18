import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { getOrCreateUserCard } from "@/lib/actions/card";
import { logoutAction } from "@/lib/actions/auth";
import CardEditor from "@/components/dashboard/CardEditor";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.dashboard, robots: { index: false, follow: false } };
}

export default async function DashboardPage() {
  const user = await requireSession();
  const { t } = await getI18n();
  const card = await getOrCreateUserCard();

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return (
    <main className="min-h-screen bg-paper text-ink">
      {/* Barra de navegación superior */}
      <header className="border-b border-ink/15 bg-paper-2/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-ink hover:text-sea transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-voltio text-basalto flex items-center justify-center text-sm font-black">
                MC
              </div>
              <span className="hidden sm:inline">MyCard</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <span className="text-xs text-ink-2 hidden sm:inline">
              {t.dashboard.connectedAs} <strong className="text-ink">{user.email}</strong>
            </span>

            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="text-xs px-3 py-1.5 rounded-lg bg-sea/10 text-sea border border-sea/20 hover:bg-sea/20 transition-colors"
              >
                {t.dashboard.adminPanel}
              </Link>
            )}

            <form action={logoutAction}>
              <button
                type="submit"
                className="text-xs px-3 py-1.5 rounded-lg bg-paper hover:bg-ink-3/30 text-ink-2 border border-ink/15 transition-colors"
              >
                {t.dashboard.logout}
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Contenido principal del editor */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
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
