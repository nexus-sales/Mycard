export default function AdminLoading() {
  return (
    <main className="min-h-screen animate-pulse bg-slate-950" aria-label="Cargando administración">
      <div className="h-16 border-b border-slate-800 bg-slate-900" />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
        <div className="h-20 max-w-xl rounded-2xl bg-slate-900" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-24 rounded-2xl border border-slate-800 bg-slate-900" />)}</div>
        <div className="h-44 rounded-2xl border border-slate-800 bg-slate-900" />
        <div className="h-72 rounded-2xl border border-slate-800 bg-slate-900" />
      </div>
      <span className="sr-only">Cargando el panel de administración…</span>
    </main>
  );
}
