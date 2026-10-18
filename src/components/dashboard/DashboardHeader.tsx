import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { logoutAction } from "@/lib/actions/auth";
import type { SessionUser } from "@/lib/session";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/** Barra superior compartida por la lista de tarjetas y el editor. */
export default function DashboardHeader({ user, t }: { user: SessionUser; t: Dictionary }) {
  return (
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
  );
}
