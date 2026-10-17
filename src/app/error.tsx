"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("Error no controlado en MyCard:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-2xl font-black text-rose-300">!</span>
        <h1 className="mt-6 text-2xl font-bold text-white">No hemos podido cargar esta página</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Ha ocurrido un error inesperado. Puedes volver a intentarlo sin perder tu sesión.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={retry} className="min-h-11 flex-1 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-500">Reintentar</button>
          <Link href="/" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-5 text-sm font-semibold text-slate-300 hover:text-white">Ir al inicio</Link>
        </div>
        {error.digest && <p className="mt-5 text-[10px] text-slate-600">Referencia: {error.digest}</p>}
      </div>
    </main>
  );
}
