import Link from "next/link";
import { getSession } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/config";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { t } = await getI18n();

  let user = null;
  try {
    user = await getSession();
  } catch (error) {
    // La portada pública debe seguir disponible durante una incidencia de base de datos.
    console.error("No se pudo recuperar la sesión en la portada:", error);
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      {/* Hero: paleta fija (no cambia con el modo oscuro) */}
      <div className="relative overflow-hidden bg-basalto text-cal">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] overflow-hidden">
          <div className="absolute left-1/2 top-[-18rem] h-[34rem] w-[54rem] -translate-x-1/2 rounded-full bg-mar/50 blur-3xl" />
          <div className="absolute right-[5%] top-32 h-64 w-64 rounded-full bg-voltio/10 blur-3xl" />
        </div>

        <header className="relative z-10 border-b border-cal/10">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-cal">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-voltio text-sm font-black text-basalto">
                MC
              </span>
              MyCard
            </Link>
            <nav aria-label={t.landing.navLabel} className="flex items-center gap-2">
              {user?.role === "ADMIN" && (
                <Link href="/admin" className="hidden rounded-lg px-3 py-2 text-sm text-cal/70 transition-colors hover:text-cal sm:inline-flex">
                  {t.landing.adminLink}
                </Link>
              )}
              <LanguageSwitcher tone="dark" />
              <Link
                href={user ? "/dashboard" : "/login"}
                className="inline-flex min-h-10 items-center rounded-xl border border-cal/25 bg-cal/5 px-4 text-sm font-semibold text-cal transition-colors hover:border-voltio hover:text-voltio"
              >
                {user ? t.landing.openPanel : t.landing.login}
              </Link>
            </nav>
          </div>
        </header>

        <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.08fr_0.92fr] lg:py-28">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-voltio/30 bg-voltio/10 px-3 py-1.5 text-xs font-semibold text-voltio">
              <span className="h-1.5 w-1.5 rounded-full bg-voltio" />
              {t.landing.badge}
            </div>
            <h1 className="text-4xl font-black tracking-[-0.04em] text-cal sm:text-6xl sm:leading-[1.05]">
              {t.landing.title}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-cal/70 sm:text-lg">
              {t.landing.lead}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={user ? "/dashboard" : "/login"}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-voltio px-6 text-sm font-bold text-basalto shadow-xl shadow-black/30 transition-colors hover:bg-voltio/90"
              >
                {user ? t.landing.ctaEdit : t.landing.ctaAccess}
                <span aria-hidden="true">→</span>
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-cal/25 bg-cal/5 px-6 text-sm font-semibold text-cal transition-colors hover:border-cal/50"
              >
                {t.landing.ctaHow}
              </a>
            </div>
            {!user && (
              <p className="mt-4 text-xs text-cal/55">{t.landing.inviteHint}</p>
            )}
          </div>

          <div className="relative mx-auto w-full max-w-md" aria-label={t.landing.exampleLabel}>
            <div aria-hidden="true" className="absolute inset-8 rounded-full bg-mar/40 blur-3xl" />
            <div className="relative rotate-1 rounded-[2rem] border border-cal/15 bg-gradient-to-b from-picon to-basalto p-3 shadow-2xl shadow-black/50">
              <div className="overflow-hidden rounded-[1.45rem] border border-cal/10 bg-basalto">
                <div className="relative h-36 bg-gradient-to-br from-mar via-mar to-voltio/80">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_38%)]" />
                </div>
                <div className="relative px-6 pb-6">
                  <div className="-mt-12 flex items-end justify-between">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-basalto bg-picon text-2xl font-black text-voltio shadow-xl">
                      AP
                    </div>
                    <span className="mb-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                      {t.landing.sampleStatus}
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-black text-cal">{t.landing.sampleName}</h2>
                  <p className="mt-1 text-sm font-medium text-voltio">{t.landing.sampleRole}</p>
                  <p className="mt-4 text-sm leading-6 text-cal/70">{t.landing.sampleBio}</p>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <span className="rounded-xl border border-cal/20 bg-picon/70 px-3 py-2.5 text-center text-xs font-semibold text-cal">{t.landing.sampleSave}</span>
                    <span className="rounded-xl bg-voltio px-3 py-2.5 text-center text-xs font-bold text-basalto">{t.landing.sampleShare}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Cómo funciona: sigue el modo claro/oscuro del sistema */}
      <section id="como-funciona" className="bg-paper">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sea">{t.landing.eyebrow}</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t.landing.sectionTitle}</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {t.landing.benefits.map((benefit, index) => (
              <article key={benefit.title} className="rounded-2xl border border-ink/10 bg-paper-2 p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-voltio text-sm font-black text-basalto">
                  {index + 1}
                </span>
                <h3 className="mt-5 font-bold text-ink">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-2">{benefit.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Pie: paleta fija */}
      <footer className="bg-basalto px-4 py-8 text-center text-xs text-cal/55">
        <p>{t.landing.footerTagline}</p>
        <p className="mt-2">{fmt(t.landing.footerRights, { year: new Date().getFullYear() })}</p>
      </footer>
    </main>
  );
}
