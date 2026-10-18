"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";

type State = { error?: string } | undefined;

export default function LoginForm() {
  const { t } = useI18n();
  const [state, formAction, isPending] = useActionState<State, FormData>(
    loginAction,
    undefined
  );

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-ink/15 bg-paper-2/90 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8"
    >
      {state?.error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
        >
          {state.error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium text-ink-2"
        >
          {t.auth.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="min-h-11 w-full rounded-xl border border-ink/15 bg-paper/70 px-3 text-sm text-ink outline-none transition focus:border-sea focus:ring-2 focus:ring-sea/30"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-medium text-ink-2"
        >
          {t.auth.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="min-h-11 w-full rounded-xl border border-ink/15 bg-paper/70 px-3 text-sm text-ink outline-none transition focus:border-sea focus:ring-2 focus:ring-sea/30"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="min-h-12 w-full rounded-xl bg-voltio px-4 text-sm font-bold text-basalto shadow-lg shadow-basalto/20 transition-colors hover:bg-voltio/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? t.auth.submitting : t.auth.submit}
      </button>
    </form>
  );
}
