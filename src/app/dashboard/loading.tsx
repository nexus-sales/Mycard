export default function DashboardLoading() {
  return (
    <main className="min-h-screen animate-pulse bg-slate-950 text-slate-100" aria-label="Cargando el editor">
      <div className="h-16 border-b border-slate-800 bg-slate-900/60" />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div className="h-28 rounded-2xl border border-slate-800 bg-slate-900" />
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            {[14, 18, 20].map((height) => <div key={height} className="rounded-2xl border border-slate-800 bg-slate-900" style={{ height: `${height}rem` }} />)}
          </div>
          <div className="h-[38rem] rounded-3xl border border-slate-800 bg-slate-900 lg:col-span-5" />
        </div>
      </div>
      <span className="sr-only">Cargando tu tarjeta…</span>
    </main>
  );
}
