import Link from "next/link";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const benefits = [
  {
    title: "Comparte en segundos",
    description: "Un único enlace, código QR y contacto vCard listo para guardar.",
  },
  {
    title: "Tu identidad, a tu manera",
    description: "Personaliza plantilla, colores, imágenes y los datos que haces públicos.",
  },
  {
    title: "Siempre actualizada",
    description: "Cambia tus datos sin volver a imprimir el QR ni reenviar tu tarjeta.",
  },
];

export default async function HomePage() {
  let user = null;
  try {
    user = await getSession();
  } catch (error) {
    // La portada pública debe seguir disponible durante una incidencia de base de datos.
    console.error("No se pudo recuperar la sesión en la portada:", error);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] overflow-hidden">
        <div className="absolute left-1/2 top-[-18rem] h-[34rem] w-[54rem] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute right-[5%] top-32 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-white/5">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/15 text-sm text-indigo-300">
              MC
            </span>
            MyCard
          </Link>
          <nav aria-label="Navegación principal" className="flex items-center gap-2">
            {user?.role === "ADMIN" && (
              <Link href="/admin" className="hidden rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:text-white sm:inline-flex">
                Administración
              </Link>
            )}
            <Link
              href={user ? "/dashboard" : "/login"}
              className="inline-flex min-h-10 items-center rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-200 transition-colors hover:border-indigo-500/60 hover:text-white"
            >
              {user ? "Abrir mi panel" : "Iniciar sesión"}
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.08fr_0.92fr] lg:py-28">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            Acceso privado mediante invitación
          </div>
          <h1 className="text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl sm:leading-[1.05]">
            Tu tarjeta profesional, siempre contigo.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">
            Comparte quién eres, cómo contactarte y todo tu perfil profesional desde una tarjeta digital elegante, actualizable y preparada para móvil.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={user ? "/dashboard" : "/login"}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-xl shadow-indigo-950/50 transition-colors hover:bg-indigo-500"
            >
              {user ? "Editar mi tarjeta" : "Acceder a MyCard"}
              <span aria-hidden="true">→</span>
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 px-6 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
            >
              Ver cómo funciona
            </a>
          </div>
          {!user && (
            <p className="mt-4 text-xs text-slate-500">
              ¿Has recibido una invitación? Utiliza el enlace incluido en ella para crear tu cuenta.
            </p>
          )}
        </div>

        <div className="relative mx-auto w-full max-w-md" aria-label="Ejemplo de tarjeta digital">
          <div aria-hidden="true" className="absolute inset-8 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="relative rotate-1 rounded-[2rem] border border-slate-700/80 bg-gradient-to-b from-slate-900 to-slate-950 p-3 shadow-2xl shadow-black/50">
            <div className="overflow-hidden rounded-[1.45rem] border border-white/5 bg-slate-900">
              <div className="relative h-36 bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_38%)]" />
              </div>
              <div className="relative px-6 pb-6">
                <div className="-mt-12 flex items-end justify-between">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-slate-900 bg-slate-800 text-2xl font-black text-indigo-300 shadow-xl">
                    AP
                  </div>
                  <span className="mb-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                    Disponible
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-black text-white">Alex Pérez</h2>
                <p className="mt-1 text-sm font-medium text-indigo-300">Consultoría digital · Norte Studio</p>
                <p className="mt-4 text-sm leading-6 text-slate-400">
                  Ayudo a empresas a convertir ideas complejas en productos digitales claros y útiles.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <span className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2.5 text-center text-xs font-semibold text-slate-200">Guardar contacto</span>
                  <span className="rounded-xl bg-indigo-600 px-3 py-2.5 text-center text-xs font-semibold text-white">Compartir</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="relative z-10 border-t border-white/5 bg-slate-900/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">Simple por diseño</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">Todo lo necesario para dejar una buena impresión</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {benefits.map((benefit, index) => (
              <article key={benefit.title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-sm font-black text-indigo-300">
                  {index + 1}
                </span>
                <h3 className="mt-5 font-bold text-white">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{benefit.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 px-4 py-8 text-center text-xs text-slate-600">
        <p>MyCard · Tu identidad profesional en un solo enlace</p>
        <p className="mt-2">© 2026 Grupo LMB. Todos los derechos reservados.</p>
      </footer>
    </main>
  );
}
