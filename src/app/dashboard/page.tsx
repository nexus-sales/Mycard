import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { getOrCreateUserCard } from "@/lib/actions/card";
import { logoutAction } from "@/lib/actions/auth";
import CardEditor from "@/components/dashboard/CardEditor";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mi Panel",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const user = await requireSession();
  const card = await getOrCreateUserCard();

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Barra de navegación superior */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-white hover:text-indigo-400 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-sm font-bold">
                MC
              </div>
              <span className="hidden sm:inline">MyCard</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">
              Conectado como <strong className="text-slate-200">{user.email}</strong>
            </span>

            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
              >
                Panel Admin
              </Link>
            )}

            <form action={logoutAction}>
              <button
                type="submit"
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                Cerrar sesión
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
