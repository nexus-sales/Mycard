"use client";

import React, { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

interface GoogleWalletButtonProps {
  slug?: string;
  /** Id de la tarjeta (obligatorio cuando isOwner es true). */
  cardId?: string;
  isOwner?: boolean;
  className?: string;
}

/**
 * Botón oficial "Añadir a Google Wallet" cumpliendo con las directrices de marca de Google.
 * Altura estándar recomendada: 48px o 40px con proporciones oficiales.
 */
export default function GoogleWalletButton({
  slug,
  cardId,
  isOwner = false,
  className = "",
}: GoogleWalletButtonProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const showError = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const handleClick = async () => {
    setLoading(true);
    setToast(null);

    const targetUrl = isOwner
      ? `/api/wallet/google?cardId=${encodeURIComponent(cardId ?? "")}`
      : `/c/${slug}/wallet`;

    try {
      if (isOwner) {
        // Petición al endpoint autenticado
        const res = await fetch(targetUrl);
        const data = await res.json();
        if (data.url) {
          window.open(data.url, "_blank", "noopener,noreferrer");
        } else {
          showError(data.error || t.wallet.cannotGenerate);
        }
      } else if (slug) {
        // Redirigir directamente al endpoint público de Wallet
        window.location.href = targetUrl;
      }
    } catch {
      showError(t.wallet.connectError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block w-full">
      <span className="sr-only" aria-live="polite">{toast}</span>
      {toast && (
        <div
          aria-hidden="true"
          className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-lg bg-basalto text-rose-300 text-xs font-medium border border-rose-500/30 shadow-lg whitespace-nowrap"
        >
          {toast}
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        title={t.wallet.button}
        className={`flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-neutral-700/80 bg-black px-4 text-xs font-medium text-cal shadow-md transition-all hover:bg-neutral-900 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
          loading ? "opacity-70 pointer-events-none" : ""
        } ${className}`}
      >
        {/* Icono oficial Google Wallet SVG */}
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 40 40" fill="none">
          {/* Tarjetas superpuestas características del logo de Google Wallet */}
          <rect x="6" y="10" width="28" height="20" rx="3.5" fill="#4285F4" />
          <path
            d="M6 16C6 13.7909 7.79086 12 10 12H30C32.2091 12 34 13.7909 34 16V26C34 28.2091 32.2091 30 30 30H10C7.79086 30 6 28.2091 6 26V16Z"
            fill="#34A853"
          />
          <path
            d="M6 19C6 16.7909 7.79086 15 10 15H30C32.2091 15 34 16.7909 34 19V26C34 28.2091 32.2091 30 30 30H10C7.79086 30 6 28.2091 6 26V19Z"
            fill="#FBBC04"
          />
          <path
            d="M6 22C6 19.7909 7.79086 18 10 18H30C32.2091 18 34 19.7909 34 22V26C34 28.2091 32.2091 30 30 30H10C7.79086 30 6 28.2091 6 26V22Z"
            fill="#EA4335"
          />
        </svg>

        <span className="tracking-tight text-cal font-semibold text-[13px]">
          {loading ? t.wallet.generating : t.wallet.button}
        </span>
      </button>
    </div>
  );
}
