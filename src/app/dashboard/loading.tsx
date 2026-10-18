import { getI18n } from "@/lib/i18n/server";

export default async function DashboardLoading() {
  const { t } = await getI18n();
  return (
    <main className="min-h-screen animate-pulse bg-paper text-ink" aria-label={t.loading.editor}>
      <div className="h-16 border-b border-ink/15 bg-paper-2/60" />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div className="h-28 rounded-2xl border border-ink/15 bg-paper-2" />
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            {[14, 18, 20].map((height) => <div key={height} className="rounded-2xl border border-ink/15 bg-paper-2" style={{ height: `${height}rem` }} />)}
          </div>
          <div className="h-[38rem] rounded-3xl border border-ink/15 bg-paper-2 lg:col-span-5" />
        </div>
      </div>
      <span className="sr-only">{t.loading.editorSr}</span>
    </main>
  );
}
