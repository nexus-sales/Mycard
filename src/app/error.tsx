"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/config";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { t } = useI18n();

  useEffect(() => {
    console.error("Error no controlado en MyCard:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 text-ink">
      <div className="w-full max-w-md rounded-3xl border border-ink/15 bg-paper-2 p-8 text-center shadow-2xl">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-2xl font-black text-rose-700 dark:text-rose-300">!</span>
        <h1 className="mt-6 text-2xl font-bold text-ink">{t.errors.errorTitle}</h1>
        <p className="mt-3 text-sm leading-6 text-ink-2">{t.errors.errorText}</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={retry} className="min-h-11 flex-1 rounded-xl bg-voltio px-5 text-sm font-bold text-basalto hover:bg-voltio/90">{t.errors.retry}</button>
          <Link href="/" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-ink/15 bg-paper px-5 text-sm font-semibold text-ink-2 hover:text-ink">{t.errors.goHome}</Link>
        </div>
        {error.digest && <p className="mt-5 text-[10px] text-ink-3">{fmt(t.errors.reference, { digest: error.digest })}</p>}
      </div>
    </main>
  );
}
