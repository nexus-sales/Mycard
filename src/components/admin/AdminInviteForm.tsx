"use client";

import { useActionState, useState } from "react";
import { createInviteAction } from "@/lib/actions/admin";
import { useI18n } from "@/lib/i18n/client";

type State =
  | { inviteUrl?: string; error?: string }
  | undefined;

export default function AdminInviteForm() {
  const { t } = useI18n();
  const [state, formAction, isPending] = useActionState<State, FormData>(
    createInviteAction,
    undefined
  );
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    if (!state?.inviteUrl) return;
    await navigator.clipboard.writeText(state.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-ink/15 bg-paper-2 p-4 sm:p-6">
      <form action={formAction} className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_9rem_auto]">
        <div className="flex-1 min-w-48">
          <label
            htmlFor="invite-email"
            className="mb-1.5 block text-sm font-medium text-ink-2"
          >
            {t.admin.inviteEmail}
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            placeholder={t.admin.inviteEmailPlaceholder}
            className="min-h-11 w-full rounded-xl border border-ink/15 bg-paper/70 px-3 text-sm text-ink outline-none focus:border-sea focus:ring-2 focus:ring-sea/30"
          />
        </div>

        <div>
          <label
            htmlFor="invite-hours"
            className="mb-1.5 block text-sm font-medium text-ink-2"
          >
            {t.admin.inviteHours}
          </label>
          <input
            id="invite-hours"
            name="expiresInHours"
            type="number"
            min="1"
            max="720"
            defaultValue="48"
            className="min-h-11 w-full rounded-xl border border-ink/15 bg-paper/70 px-3 text-sm text-ink outline-none focus:border-sea focus:ring-2 focus:ring-sea/30"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="min-h-11 rounded-xl bg-voltio px-5 text-sm font-bold text-basalto transition-colors hover:bg-voltio/90 disabled:opacity-60"
        >
          {isPending ? t.admin.generating : t.admin.generate}
        </button>
      </form>

      {state?.error && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{state.error}</p>
      )}

      {state?.inviteUrl && (
        <div className="mt-2 flex flex-col gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 sm:flex-row sm:items-center">
          <code className="flex-1 break-all text-xs text-emerald-700 dark:text-emerald-300">
            {state.inviteUrl}
          </code>
          <button
            type="button"
            onClick={copyUrl}
            className="min-h-10 shrink-0 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white transition-colors hover:bg-emerald-500"
          >
            {copied ? t.admin.copied : t.admin.copy}
          </button>
        </div>
      )}
    </div>
  );
}
