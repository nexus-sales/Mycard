"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/lib/actions/locale";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";

interface LanguageSwitcherProps {
  /** "auto" sigue el modo claro/oscuro; "dark" para zonas de paleta fija oscura (hero, pie). */
  tone?: "auto" | "dark";
  className?: string;
}

export default function LanguageSwitcher({ tone = "auto", className = "" }: LanguageSwitcherProps) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const change = (next: Locale) => {
    if (next === locale || isPending) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  };

  const frame = tone === "dark" ? "border-cal/20 bg-cal/5" : "border-ink/15 bg-paper-2";
  const idle = tone === "dark" ? "text-cal/70 hover:text-cal" : "text-ink-2 hover:text-ink";

  return (
    <div
      role="group"
      aria-label={t.lang.label}
      className={`inline-flex items-center rounded-lg border p-0.5 text-xs font-bold ${frame} ${className}`}
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          onClick={() => change(code)}
          aria-pressed={code === locale}
          aria-label={t.lang[code]}
          title={t.lang[code]}
          disabled={isPending}
          className={`min-h-8 min-w-9 rounded-md px-2 transition-colors disabled:opacity-60 ${
            code === locale ? "bg-voltio text-basalto" : idle
          }`}
        >
          {t.lang.short[code]}
        </button>
      ))}
    </div>
  );
}
