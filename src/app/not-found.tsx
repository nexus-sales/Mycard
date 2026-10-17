import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 text-slate-100">
      <div aria-hidden="true" className="absolute h-72 w-72 rounded-full bg-indigo-600/15 blur-3xl" />
      <div className="relative max-w-lg text-center">
        <span className="text-7xl font-black tracking-tighter text-indigo-400/30 sm:text-8xl">404</span>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Esta página no está disponible</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-400">Puede que el enlace haya caducado, que la tarjeta esté desactivada o que la dirección no sea correcta.</p>
        <Link href="/" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white hover:bg-indigo-500">Volver a MyCard</Link>
      </div>
    </main>
  );
}
