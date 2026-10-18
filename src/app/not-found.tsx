import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper px-4 text-ink">
      <div aria-hidden="true" className="absolute h-72 w-72 rounded-full bg-sea/15 blur-3xl" />
      <div className="relative max-w-lg text-center">
        <span className="text-7xl font-black tracking-tighter text-sea sm:text-8xl">404</span>
        <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">{t.errors.notFoundTitle}</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-ink-2">{t.errors.notFoundText}</p>
        <Link href="/" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-voltio px-6 text-sm font-bold text-basalto hover:bg-voltio/90">{t.errors.backHome}</Link>
      </div>
    </main>
  );
}
