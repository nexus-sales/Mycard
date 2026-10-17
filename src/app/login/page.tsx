import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default async function LoginPage() {
  const user = await getSession();
  if (user) redirect("/dashboard");

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 text-slate-100 flex items-center justify-center">
      <div aria-hidden="true" className="absolute left-1/2 top-[-16rem] h-[32rem] w-[44rem] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mx-auto mb-8 flex w-fit items-center gap-2.5 font-bold text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/15 text-sm text-indigo-300">MC</span>
          MyCard
        </Link>
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold text-white">Bienvenido de nuevo</h1>
          <p className="mt-2 text-sm text-slate-400">Accede para editar y compartir tu tarjeta digital.</p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          El registro solo está disponible mediante una invitación válida.
        </p>
      </div>
    </main>
  );
}
