"use client";

import { useEffect, useRef, useState } from "react";
import GoogleWalletButton from "./GoogleWalletButton";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/config";

interface ActionButtonsProps {
  cardName: string;
  shareUrl: string;
  vcardUrl?: string;
  slug?: string;
  allowPublicWallet?: boolean;
  isOwner?: boolean;
  primaryColor?: string;
}

export default function CardActionButtons({
  cardName,
  shareUrl,
  vcardUrl,
  slug,
  allowPublicWallet = true,
  isOwner = false,
  primaryColor = "#0D4F52",
}: ActionButtonsProps) {
  const { t } = useI18n();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(msg);
    toastTimer.current = setTimeout(() => setToastMessage(null), 3000);
  };

  const copyShareUrl = async () => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      return;
    }

    const input = document.createElement("textarea");
    input.value = shareUrl;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    if (!copied) throw new Error("Clipboard unavailable");
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: fmt(t.card.shareTitle, { name: cardName }),
          text: fmt(t.card.shareText, { name: cardName }),
          url: shareUrl,
        });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    try {
      await copyShareUrl();
      showToast(t.card.linkCopied);
    } catch {
      showToast(t.card.copyFailed);
    }
  };

  const handleSaveContact = () => {
    if (vcardUrl) {
      showToast(t.card.downloadingVcard);
      window.location.href = vcardUrl;
    } else {
      showToast(t.card.vcardPreview);
    }
  };

  return (
    <div className="w-full space-y-2.5 pt-2">
      <span className="sr-only" aria-live="polite">{toastMessage}</span>
      {/* Toast flotante */}
      {toastMessage && (
        <div
          aria-hidden="true"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-basalto/90 text-cal text-xs font-medium shadow-2xl backdrop-blur-md border border-cal/10 animate-fade-in"
        >
          {toastMessage}
        </div>
      )}

      {/* Botón Principal: Guardar Contacto */}
      <button
        type="button"
        onClick={handleSaveContact}
        style={{ backgroundColor: primaryColor }}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-cal shadow-lg transition-all hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-basalto"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8zm8-2v6m3-3h-6"
          />
        </svg>
        {t.card.saveContact}
      </button>

      {/* Botón oficial de Google Wallet (solo si allowPublicWallet es true) */}
      {slug && allowPublicWallet && (
        <GoogleWalletButton slug={slug} isOwner={isOwner} />
      )}

      {/* Botón Compartir */}
      <button
        type="button"
        onClick={handleShare}
        className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-xs font-medium text-cal transition-all hover:bg-white/15 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        {t.card.shareLink}
      </button>
    </div>
  );
}
