"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCardAction, deleteCardAction } from "@/lib/actions/card";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/config";
import { readableTextColor } from "@/lib/qr";

export interface CardSummary {
  id: string;
  slug: string;
  active: boolean;
  views: number;
  template: "MINIMAL" | "MODERN" | "CLASSIC";
  name: string;
  jobTitle: string;
  company: string;
  primaryColor: string;
}

export default function CardList({ cards, max }: { cards: CardSummary[]; max: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const [isCreating, startCreate] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const limitReached = cards.length >= max;

  const createCard = () => {
    setError(null);
    startCreate(async () => {
      const res = await createCardAction();
      if (res.error || !res.cardId) {
        setError(res.error ?? null);
        return;
      }
      router.push(`/dashboard/${res.cardId}`);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t.dashboard.cardsTitle}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink-2">
            {fmt(t.dashboard.cardsSubtitle, { max })}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button
            type="button"
            onClick={createCard}
            disabled={isCreating || limitReached}
            className="min-h-11 rounded-xl bg-voltio px-5 text-sm font-bold text-basalto transition-colors hover:bg-voltio/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? t.dashboard.creating : `+ ${t.dashboard.newCard}`}
          </button>
          <span className="text-xs text-ink-3" aria-live="polite">
            {limitReached
              ? fmt(t.dashboard.limitReached, { max })
              : fmt(t.dashboard.cardsCount, { count: cards.length, max })}
          </span>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/20 bg-paper-2/40 px-6 py-14 text-center text-sm text-ink-3">
          {t.dashboard.noCards}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CardItem({ card }: { card: CardSummary }) {
  const { t } = useI18n();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const remove = () => {
    setError(null);
    startDelete(async () => {
      const res = await deleteCardAction(card.id);
      if (res.error) {
        setError(res.error);
        setConfirming(false);
        return;
      }
      router.refresh();
    });
  };

  const initials = (card.name || "MC").slice(0, 2).toUpperCase();

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-paper-2 shadow-sm">
      <div className="h-2 w-full" style={{ backgroundColor: card.primaryColor }} />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-black text-cal"
            style={{ backgroundColor: card.primaryColor, color: readableTextColor(card.primaryColor) }}
            aria-hidden="true"
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-bold text-ink">{card.name || t.dashboard.untitled}</h2>
            {(card.jobTitle || card.company) && (
              <p className="truncate text-xs text-ink-2">
                {[card.jobTitle, card.company].filter(Boolean).join(" · ")}
              </p>
            )}
            <p className="mt-1 truncate font-mono text-xs text-ink-3">/c/{card.slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span
            className={`rounded-full border px-2 py-0.5 font-semibold ${
              card.active
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
            }`}
          >
            {card.active ? t.dashboard.statusActive : t.dashboard.statusHidden}
          </span>
          <span className="text-ink-3">{fmt(t.dashboard.views, { count: card.views })}</span>
        </div>

        {error && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{error}</p>}

        {confirming ? (
          <div className="mt-auto space-y-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
            <p className="text-xs leading-5 text-ink">{t.dashboard.confirmDelete}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={remove}
                disabled={isDeleting}
                className="min-h-9 flex-1 rounded-lg bg-rose-600 px-3 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-60"
              >
                {isDeleting ? t.dashboard.deleting : t.dashboard.confirmYes}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={isDeleting}
                className="min-h-9 flex-1 rounded-lg border border-ink/15 bg-paper px-3 text-xs font-semibold text-ink-2 hover:text-ink"
              >
                {t.dashboard.cancel}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-auto flex flex-wrap gap-2">
            <Link
              href={`/dashboard/${card.id}`}
              className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg bg-voltio px-3 text-xs font-bold text-basalto hover:bg-voltio/90"
            >
              {t.dashboard.edit}
            </Link>
            <Link
              href={`/c/${card.slug}`}
              target="_blank"
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-ink/15 bg-paper px-3 text-xs font-semibold text-ink-2 hover:text-ink"
            >
              {t.dashboard.viewPublic}
            </Link>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="min-h-9 rounded-lg border border-rose-500/30 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
            >
              {t.dashboard.delete}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
