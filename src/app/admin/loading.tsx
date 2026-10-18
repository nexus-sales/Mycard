import { getI18n } from "@/lib/i18n/server";

export default async function AdminLoading() {
  const { t } = await getI18n();
  return (
    <main className="min-h-screen animate-pulse bg-paper" aria-label={t.loading.admin}>
      <div className="h-16 border-b border-ink/15 bg-paper-2" />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
        <div className="h-20 max-w-xl rounded-2xl bg-paper-2" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-24 rounded-2xl border border-ink/15 bg-paper-2" />)}</div>
        <div className="h-44 rounded-2xl border border-ink/15 bg-paper-2" />
        <div className="h-72 rounded-2xl border border-ink/15 bg-paper-2" />
      </div>
      <span className="sr-only">{t.loading.adminSr}</span>
    </main>
  );
}
