import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import AdminInviteForm from "@/components/admin/AdminInviteForm";
import UserTable from "@/components/admin/UserTable";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getI18n } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.admin, robots: { index: false, follow: false } };
}

export default async function AdminPage() {
  const admin = await requireAdmin();
  const { t, locale } = await getI18n();
  const dateLocale = intlLocale(locale);
  const [users, invites] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    }),
    prisma.invite.findMany({
      where: { usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, expiresAt: true, createdAt: true },
    }),
  ]);

  const activeUsers = users.filter((user) => user.active).length;
  const admins = users.filter((user) => user.role === "ADMIN").length;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-ink/15 bg-paper-2/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-ink">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-voltio text-sm font-black text-basalto">MC</span>
            <span className="hidden sm:inline">MyCard</span>
            <span className="rounded-full border border-sea/20 bg-sea/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sea">{t.admin.badge}</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <span className="hidden text-xs text-ink-3 md:inline">{admin.email}</span>
            <Link href="/dashboard" className="inline-flex min-h-10 items-center rounded-xl border border-ink/15 bg-paper px-4 text-sm font-semibold text-ink transition-colors hover:border-sea/50 hover:text-ink">
              {t.admin.myCard}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sea">{t.admin.eyebrow}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t.admin.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-2">{t.admin.subtitle}</p>
        </div>

        <section aria-label={t.admin.summary} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: t.admin.metrics.users, value: users.length, color: "text-ink" },
            { label: t.admin.metrics.active, value: activeUsers, color: "text-emerald-700 dark:text-emerald-300" },
            { label: t.admin.metrics.invites, value: invites.length, color: "text-sea" },
            { label: t.admin.metrics.admins, value: admins, color: "text-sea" },
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-ink/15 bg-paper-2 p-4 sm:p-5">
              <strong className={`block text-2xl font-black ${metric.color}`}>{metric.value}</strong>
              <span className="mt-1 block text-xs font-medium text-ink-3">{metric.label}</span>
            </div>
          ))}
        </section>

        <section aria-labelledby="create-invite-title">
          <div className="mb-4">
            <h2 id="create-invite-title" className="text-lg font-bold text-ink">{t.admin.createInvite}</h2>
            <p className="mt-1 text-sm text-ink-3">{t.admin.createInviteHint}</p>
          </div>
          <AdminInviteForm />
        </section>

        <section aria-labelledby="pending-invites-title">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 id="pending-invites-title" className="text-lg font-bold text-ink">{t.admin.pendingInvites}</h2>
              <p className="mt-1 text-sm text-ink-3">{t.admin.pendingInvitesHint}</p>
            </div>
            <span className="rounded-full bg-paper px-3 py-1 text-xs font-bold text-ink-2">{invites.length}</span>
          </div>
          {invites.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink/15 bg-paper-2/40 px-6 py-10 text-center text-sm text-ink-3">{t.admin.noInvites}</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-ink/15 bg-paper-2">
              <table className="w-full min-w-[34rem] text-sm">
                <caption className="sr-only">{t.admin.pendingCaption}</caption>
                <thead className="bg-paper/60 text-xs uppercase tracking-wider text-ink-3">
                  <tr><th scope="col" className="px-5 py-3 text-left">{t.admin.colRecipient}</th><th scope="col" className="px-5 py-3 text-left">{t.admin.colCreated}</th><th scope="col" className="px-5 py-3 text-left">{t.admin.colExpires}</th></tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {invites.map((invite) => (
                    <tr key={invite.id}>
                      <td className="px-5 py-4 font-medium text-ink">{invite.email ?? <span className="italic text-ink-3">{t.admin.openInvite}</span>}</td>
                      <td className="px-5 py-4 text-ink-3">{invite.createdAt.toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="px-5 py-4 text-ink-2">{invite.expiresAt.toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="users-title">
          <div className="mb-4 flex items-center justify-between">
            <div><h2 id="users-title" className="text-lg font-bold text-ink">{t.admin.usersTitle}</h2><p className="mt-1 text-sm text-ink-3">{t.admin.usersHint}</p></div>
            <span className="rounded-full bg-paper px-3 py-1 text-xs font-bold text-ink-2">{users.length}</span>
          </div>
          <UserTable users={users} />
        </section>
      </div>
    </main>
  );
}
